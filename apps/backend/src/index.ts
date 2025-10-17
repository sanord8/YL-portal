import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter } from './middleware/rateLimit';

const app = new Hono();

// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Logging
app.use('*', logger());

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

// TODO: Add tRPC router
// app.use('/api/trpc/*', trpcHandler);

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
