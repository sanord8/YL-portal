import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { validateSession, SESSION_COOKIE_NAME } from '../services/authService';

/**
 * Admin Middleware
 * Requires user to be authenticated AND have isAdmin = true
 */
export async function requireAdmin(c: Context, next: Next) {
  // Get session from cookie
  const sessionId = c.req.header('Authorization')?.replace('Bearer ', '') ||
                    getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionId) {
    return c.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      401
    );
  }

  // Validate session and get user
  const { user } = await validateSession(sessionId);

  if (!user) {
    return c.json(
      { error: 'Unauthorized', message: 'Invalid or expired session' },
      401
    );
  }

  // Check if user is admin
  if (!user.isAdmin) {
    return c.json(
      { error: 'Forbidden', message: 'Admin access required' },
      403
    );
  }

  // Store user in context for use in route handlers
  c.set('user', user);

  await next();
}
