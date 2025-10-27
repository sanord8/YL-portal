import { redis } from '../middleware/rateLimit';

/**
 * Session Cache Service
 * Caches session validation results in Redis to avoid database hits
 * TTL: 5 minutes (300 seconds)
 */

const SESSION_CACHE_PREFIX = 'session:';
const SESSION_CACHE_TTL = 300; // 5 minutes

export interface CachedSession {
  userId: string;
  expiresAt: string;
  rememberMe: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    isAdmin: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
}

/**
 * Get session from cache
 */
export async function getSessionFromCache(
  sessionId: string
): Promise<CachedSession | null> {
  try {
    const cacheKey = SESSION_CACHE_PREFIX + sessionId;
    const cached = await redis.get(cacheKey);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as CachedSession;
  } catch (error) {
    console.error('Session cache get error:', error);
    return null; // Fall back to database on cache error
  }
}

/**
 * Set session in cache
 */
export async function setSessionInCache(
  sessionId: string,
  session: CachedSession
): Promise<void> {
  try {
    const cacheKey = SESSION_CACHE_PREFIX + sessionId;
    await redis.setex(cacheKey, SESSION_CACHE_TTL, JSON.stringify(session));
  } catch (error) {
    console.error('Session cache set error:', error);
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Invalidate session cache
 * Call this on logout or when user data changes
 */
export async function invalidateSessionCache(sessionId: string): Promise<void> {
  try {
    const cacheKey = SESSION_CACHE_PREFIX + sessionId;
    await redis.del(cacheKey);
  } catch (error) {
    console.error('Session cache invalidation error:', error);
  }
}

/**
 * Invalidate all sessions for a user
 * Call this on password change or account updates
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  try {
    // Find all session keys for this user
    const pattern = SESSION_CACHE_PREFIX + '*';
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return;
    }

    // Get all sessions and filter by userId
    const pipeline = redis.pipeline();
    keys.forEach((key) => pipeline.get(key));
    const results = await pipeline.exec();

    const keysToDelete: string[] = [];
    results?.forEach((result, index) => {
      if (result && result[1]) {
        try {
          const session = JSON.parse(result[1] as string) as CachedSession;
          if (session.userId === userId) {
            keysToDelete.push(keys[index]);
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    });

    // Delete matching sessions
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
  } catch (error) {
    console.error('User sessions invalidation error:', error);
  }
}
