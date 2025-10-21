import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { prisma } from '../db/prisma';
import { validateSession, SESSION_COOKIE_NAME } from '../services/authService';

/**
 * tRPC Context
 * Available in all tRPC procedures
 */
export interface TRPCContext {
  prisma: typeof prisma;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } | null;
  sessionId: string | null;
}

/**
 * Create tRPC context from Hono context
 */
export async function createContext(c: Context): Promise<TRPCContext> {
  // Get session from cookie
  const sessionId = getCookie(c, SESSION_COOKIE_NAME) || null;

  let user = null;

  if (sessionId) {
    const { user: sessionUser } = await validateSession(sessionId);
    user = sessionUser;
  }

  return {
    prisma,
    user,
    sessionId,
  };
}
