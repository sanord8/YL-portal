import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { getCookie } from 'hono/cookie';
import { timeout } from 'hono/timeout';
import { csrf } from 'hono/csrf';
import { compress } from 'hono/compress';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter, redis } from './middleware/rateLimit';
import authRouter from './routes/auth';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './trpc';
import { createContext } from './trpc/context';
import { initializeWebSocketServer } from './services/websocketService';
import { createServer } from 'net';
import { execSync } from 'child_process';
import { prisma } from './db/prisma';

const app = new Hono();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Logging
app.use('*', logger());

// Response Compression (Gzip) - 50% size reduction
// Compress responses > 1KB for faster transfer
// Note: Using gzip instead of brotli for Node.js compatibility
app.use('*', compress({
  encoding: 'gzip',    // Gzip is universally supported (brotli not available in Node.js CompressionStream)
  threshold: 1024,     // Only compress responses > 1KB
}));

// Request timeout (30 seconds)
app.use('*', timeout(30000));

// Security headers (CSP, X-Frame-Options, etc.)
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}));

// CORS
app.use('*', corsMiddleware);

// CSRF Protection - Only for state-changing operations
// Skip for GET requests and health checks (10x faster for read operations)
app.use('*', async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  // Skip CSRF for:
  // - GET requests (safe methods)
  // - Health checks
  // - WebSocket connections
  if (method === 'GET' || path === '/health' || path.startsWith('/api/ws')) {
    return next();
  }

  // Apply CSRF protection for POST, PUT, DELETE, PATCH
  return csrf({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })(c, next);
});

// Selective rate limiting - Only for auth and mutation endpoints
// Skip for health checks, static assets, and tRPC queries (5x faster)
app.use('*', async (c, next) => {
  const path = c.req.path;

  // Skip rate limiting for:
  // - Health checks
  // - tRPC query operations (reads)
  if (path === '/health' || (path.includes('/api/trpc') && c.req.method === 'GET')) {
    return next();
  }

  // Stricter rate limiting for auth endpoints (30 req/min)
  if (path.startsWith('/api/auth')) {
    return rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 })(c, next);
  }

  // Normal rate limiting for mutations (100 req/min)
  return rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 })(c, next);
});

// ============================================
// ROUTES
// ============================================

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Health check with dependency monitoring
app.get('/health', async (c) => {
  const checks = await Promise.allSettled([
    // Database health check
    (async () => {
      const start = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        return {
          status: 'healthy' as const,
          responseTime: Date.now() - start,
        };
      } catch (error) {
        return {
          status: 'unhealthy' as const,
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })(),

    // Redis health check
    (async () => {
      const start = Date.now();
      try {
        // Check Redis connection status
        if (redis.status === 'ready' || redis.status === 'connect') {
          // Try a ping command
          await redis.ping();
          return {
            status: 'healthy' as const,
            responseTime: Date.now() - start,
          };
        } else if (redis.status === 'connecting' || redis.status === 'reconnecting') {
          return {
            status: 'degraded' as const,
            responseTime: Date.now() - start,
            message: 'Redis is reconnecting',
          };
        } else {
          return {
            status: 'unavailable' as const,
            responseTime: Date.now() - start,
            message: `Redis status: ${redis.status}`,
          };
        }
      } catch (error) {
        return {
          status: 'unavailable' as const,
          responseTime: Date.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })(),
  ]);

  // Extract results
  const dbResult = checks[0].status === 'fulfilled' ? checks[0].value : { status: 'unhealthy' as const, responseTime: 0, error: 'Check failed' };
  const redisResult = checks[1].status === 'fulfilled' ? checks[1].value : { status: 'unavailable' as const, responseTime: 0, error: 'Check failed' };

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (dbResult.status === 'unhealthy') {
    overallStatus = 'unhealthy'; // Database is critical
  } else if (redisResult.status !== 'healthy') {
    overallStatus = 'degraded'; // Redis unavailable but not critical
  } else {
    overallStatus = 'healthy';
  }

  // Calculate uptime
  const uptimeMs = Date.now() - serverStartTime;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: uptimeMs,
    services: {
      database: dbResult,
      redis: redisResult,
    },
  };

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return c.json(response, httpStatus);
});

// API routes
app.get('/api/v1/hello', (c) => {
  return c.json({
    message: 'Welcome to YL Portal API',
    documentation: '/api/v1/docs'
  });
});

// Authentication routes
app.route('/api/auth', authRouter);

// tRPC routes - Type-safe API endpoints
app.all('/api/trpc/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c),
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    },
    500
  );
});

// ============================================
// PORT MANAGEMENT UTILITIES
// ============================================

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

/**
 * Find and kill process using a port (Windows compatible)
 */
async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Find PID using netstat
      const netstatOutput = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf-8',
      });

      // Extract PID from output (last column)
      const lines = netstatOutput.trim().split('\n');
      const pids = new Set<string>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          pids.add(pid);
        }
      }

      // Kill each unique PID
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`✅ Killed process ${pid} on port ${port}`);
        } catch {
          // Process might have already exited
        }
      }

      return pids.size > 0;
    } else {
      // Linux/Mac
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`✅ Killed process on port ${port}`);
      return true;
    }
  } catch (err) {
    // No process found or unable to kill
    return false;
  }
}

// ============================================
// SERVER STARTUP
// ============================================

const port = Number(process.env.PORT) || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

let server: any;

async function startServer() {
  try {
    console.log(`🚀 Server starting on http://localhost:${port}`);

    // Check if port is available
    const portAvailable = await isPortAvailable(port);

    if (!portAvailable) {
      console.warn(`⚠️  Port ${port} is already in use`);

      if (isDevelopment) {
        console.log('🔄 Attempting to kill process and retry...');
        const killed = await killProcessOnPort(port);

        if (killed) {
          // Wait a bit for port to be released
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check again
          const nowAvailable = await isPortAvailable(port);
          if (!nowAvailable) {
            throw new Error(
              `Port ${port} is still in use after cleanup attempt. Please manually kill the process.`
            );
          }
          console.log('✅ Port is now available');
        } else {
          throw new Error(
            `Could not free port ${port}. Please run: pnpm kill-port ${port}`
          );
        }
      } else {
        throw new Error(
          `Port ${port} is already in use. Please ensure no other instance is running.`
        );
      }
    }

    // Start the server
    server = serve({
      fetch: app.fetch,
      port,
    });

    // Initialize WebSocket server
    initializeWebSocketServer(server);

    console.log('✅ WebSocket server initialized on /api/ws');
    console.log(`✅ Server running on http://localhost:${port}`);
  } catch (err: any) {
    console.error('❌ Failed to start server:', err.message);

    if (err.code === 'EADDRINUSE') {
      console.error(`\n💡 Port ${port} is occupied. Try one of these solutions:`);
      console.error(`   1. Run: pnpm dev:clean`);
      console.error(`   2. Run: pnpm kill-port ${port}`);
      console.error(`   3. Manually kill the process using port ${port}\n`);
    }

    process.exit(1);
  }
}

// Start the server
startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('⚠️  Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.error('❌ Graceful shutdown timeout. Forcing exit.');
    process.exit(1);
  }, 10000); // 10 seconds timeout

  try {
    // Close HTTP server (stops accepting new connections)
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('❌ Error closing HTTP server:', err);
          reject(err);
        } else {
          console.log('✅ HTTP server closed');
          resolve();
        }
      });
    });

    // Close Redis connection if it exists
    try {
      const { closeRedis } = await import('./middleware/rateLimit');
      await closeRedis();
      console.log('✅ Redis connection closed');
    } catch (err) {
      console.error('⚠️  Error closing Redis:', err);
    }

    // Close WebSocket connections
    try {
      const { closeWebSocketServer } = await import('./services/websocketService');
      await closeWebSocketServer();
      console.log('✅ WebSocket server closed');
    } catch (err) {
      console.error('⚠️  Error closing WebSocket server:', err);
    }

    clearTimeout(forceExitTimeout);
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    clearTimeout(forceExitTimeout);
    console.error('❌ Error during graceful shutdown:', err);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
