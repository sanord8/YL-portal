import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { prisma } from '../db/prisma';

// Session cookie name
const SESSION_COOKIE_NAME = 'yl_session';

/**
 * Authentication middleware using Lucia-style session validation
 */
export async function authMiddleware(c: Context, next: Next) {
  const sessionId = c.req.header('Authorization')?.replace('Bearer ', '') ||
                    getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionId) {
    return c.json({ error: 'Unauthorized', message: 'No session provided' }, 401);
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return c.json({ error: 'Unauthorized', message: 'Invalid session' }, 401);
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: sessionId } });
      return c.json({ error: 'Unauthorized', message: 'Session expired' }, 401);
    }

    // Check if user is soft-deleted
    if (session.user.deletedAt) {
      return c.json({ error: 'Unauthorized', message: 'User account is inactive' }, 401);
    }

    // Attach user to context
    c.set('user', session.user);
    c.set('sessionId', sessionId);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

/**
 * Optional auth middleware - doesn't fail if no session
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const sessionId = c.req.header('Authorization')?.replace('Bearer ', '') ||
                    getCookie(c, SESSION_COOKIE_NAME);

  if (sessionId) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });

      if (session && session.expiresAt >= new Date() && !session.user.deletedAt) {
        c.set('user', session.user);
        c.set('sessionId', sessionId);
      }
    } catch (error) {
      console.error('Optional auth middleware error:', error);
    }
  }

  await next();
}
