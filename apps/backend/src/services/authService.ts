import { hash, verify } from '@node-rs/argon2';
import { prisma } from '../db/prisma';
import { generateIdFromEntropySize } from 'lucia';

const SESSION_COOKIE_NAME = 'yl_session';

// Argon2 configuration for secure password hashing
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
  } catch (error) {
    return false;
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  rememberMe: boolean = false
): Promise<{ sessionId: string; expiresAt: Date }> {
  // Generate a secure session ID
  const sessionId = generateIdFromEntropySize(25); // 40 character session ID

  // Calculate expiry: 7 days default, 30 days if "remember me"
  const expiresAt = new Date();
  if (rememberMe) {
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  } else {
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  }

  // Create session in database with rememberMe preference
  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
      rememberMe,
    },
  });

  return { sessionId, expiresAt };
}

/**
 * Validate a session and return the user
 */
export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          twoFactorEnabled: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session) {
    return { session: null, user: null };
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return { session: null, user: null };
  }

  // Check if user is soft-deleted
  if (session.user.deletedAt) {
    return { session: null, user: null };
  }

  // Extend session if it's close to expiring (refresh within last 24 hours)
  // Preserve the original rememberMe preference
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (session.expiresAt < oneDayFromNow) {
    const newExpiresAt = new Date();
    // Use stored rememberMe preference to determine extension duration
    const sessionDuration = session.rememberMe ? 30 : 7;
    newExpiresAt.setDate(newExpiresAt.getDate() + sessionDuration);

    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: newExpiresAt },
    });

    session.expiresAt = newExpiresAt;
  }

  return { session, user: session.user };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {
    // Ignore errors if session doesn't exist
  });
}

/**
 * Delete all sessions for a user (logout from all devices)
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Get session cookie configuration
 */
export function getSessionCookieConfig(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export { SESSION_COOKIE_NAME };
