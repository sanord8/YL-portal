import { Context, Next } from 'hono';
import { Redis } from 'ioredis';

// Create Redis client with resilient configuration
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true, // Don't connect immediately
  reconnectOnError(err) {
    console.error('Redis reconnection error:', err.message);
    return true; // Retry connection
  },
});

// Connection event handlers
redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Try to connect with error handling
redis.connect().catch((err) => {
  console.warn('⚠️  Redis unavailable, rate limiting will be disabled:', err.message);
});

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

/**
 * Get client IP address safely
 */
function getClientIP(c: Context): string {
  // Only trust forwarded headers in production with known proxy
  if (process.env.NODE_ENV === 'production' && process.env.TRUSTED_PROXY === 'true') {
    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) {
      // Take first IP from comma-separated list
      return forwarded.split(',')[0].trim();
    }
  }

  // Development: use real IP or fallback
  return c.req.header('x-real-ip') || 'unknown';
}

/**
 * Sliding window rate limiter using Redis
 */
export function rateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests } = options;

  return async (c: Context, next: Next) => {
    const identifier = getClientIP(c);
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await redis.zcard(key);

      if (requestCount >= maxRequests) {
        // Set rate limit headers before returning error
        c.header('X-RateLimit-Limit', maxRequests.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

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
      c.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if Redis is down but still set headers
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', 'unknown');
      await next();
    }
  };
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
});
