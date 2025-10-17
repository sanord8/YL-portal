import { Context, Next } from 'hono';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/**
 * Sliding window rate limiter using Redis
 */
export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options;

  return async (c: Context, next: Next) => {
    const identifier = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await redis.zcard(key);

      if (requestCount >= maxRequests) {
        return c.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
          },
          429
        );
      }

      // Add current request
      await redis.zadd(key, now, `${now}`);
      await redis.expire(key, Math.ceil(windowMs / 1000));

      // Add rate limit headers
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', (maxRequests - requestCount - 1).toString());

      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if Redis is down
      await next();
    }
  };
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
});
