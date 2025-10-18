import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { getCookie } from 'hono/cookie';
import { timeout } from 'hono/timeout';
import { csrf } from 'hono/csrf';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter } from './middleware/rateLimit';
import authRouter from './routes/auth';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from './trpc';
import { createContext } from './trpc/context';

const app = new Hono();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Logging
app.use('*', logger());

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

// CSRF Protection
app.use('*', csrf({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

// Rate limiting - 100 requests per minute
app.use('*', rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }));

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
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
// SERVER STARTUP
// ============================================

const port = Number(process.env.PORT) || 3000;

console.log(`🚀 Server starting on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
