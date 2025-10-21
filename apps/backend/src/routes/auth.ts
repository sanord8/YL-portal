import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  validateSession,
  getSessionCookieConfig,
  SESSION_COOKIE_NAME,
} from '../services/authService';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
});

/**
 * POST /api/auth/register
 * DISABLED: Public registration is not allowed
 * Users must be created by an administrator
 */
auth.post('/register', async (c) => {
  return c.json(
    {
      error: 'Registration disabled',
      message: 'Public registration is not allowed. Please contact your administrator to create an account.',
    },
    403
  );
});

// LEGACY CODE - Kept for reference if needed in the future
// /**
//  * POST /api/auth/register
//  * Register a new user
//  */
// auth.post('/register', async (c) => {
//   try {
//     // Parse and validate request body
//     const body = await c.req.json();
//     const validation = registerSchema.safeParse(body);
//
//     if (!validation.success) {
//       return c.json(
//         {
//           error: 'Validation failed',
//           message: validation.error.errors[0].message,
//           details: validation.error.errors,
//         },
//         400
//       );
//     }
//
//     const { name, email, password } = validation.data;
//
//     // Check if user already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { email: email.toLowerCase() },
//     });
//
//     if (existingUser) {
//       return c.json(
//         {
//           error: 'Registration failed',
//           message: 'An account with this email already exists',
//         },
//         409
//       );
//     }
//
//     // Hash password
//     const passwordHash = await hashPassword(password);
//
//     // Generate email verification token
//     const verifyToken = crypto.randomBytes(32).toString('hex');
//     const verifyExpires = new Date();
//     verifyExpires.setHours(verifyExpires.getHours() + 24); // 24 hour expiry
//
//     // Create user
//     const user = await prisma.user.create({
//       data: {
//         name,
//         email: email.toLowerCase(),
//         passwordHash,
//         emailVerifyToken: verifyToken,
//         emailVerifyExpires: verifyExpires,
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         emailVerified: true,
//         createdAt: true,
//       },
//     });
//
//     // Send verification email (don't fail registration if email fails)
//     try {
//       await sendVerificationEmail(user.email, user.name, verifyToken);
//     } catch (emailError) {
//       console.error('Failed to send verification email:', emailError);
//       // Continue with registration - user can request resend later
//     }
//
//     // Create session (auto-login)
//     const { sessionId, expiresAt } = await createSession(user.id, false);
//
//     // Set session cookie
//     const cookieConfig = getSessionCookieConfig(expiresAt);
//     c.header(
//       'Set-Cookie',
//       `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=${cookieConfig.path}; SameSite=${cookieConfig.sameSite}; Expires=${cookieConfig.expires.toUTCString()}${cookieConfig.secure ? '; Secure' : ''}`
//     );
//
//     return c.json({
//       success: true,
//       message: 'Account created successfully',
//       user,
//       session: {
//         expiresAt: expiresAt.toISOString(),
//         rememberMe: false,
//       }
//     }, 201);
//   } catch (error) {
//     console.error('Registration error:', error);
//     return c.json(
//       {
//         error: 'Internal server error',
//         message: 'An error occurred during registration',
//       },
//       500
//     );
//   }
// });

/**
 * POST /api/auth/login
 * Login a user
 */
auth.post('/login', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'Validation failed',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { email, password, rememberMe } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return c.json(
        {
          error: 'Authentication failed',
          message: 'Invalid email or password',
        },
        401
      );
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      return c.json(
        {
          error: 'Authentication failed',
          message: 'This account has been deactivated',
        },
        401
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return c.json(
        {
          error: 'Authentication failed',
          message: 'Invalid email or password',
        },
        401
      );
    }

    // Create session
    const { sessionId, expiresAt } = await createSession(user.id, rememberMe);

    // Set session cookie
    const cookieConfig = getSessionCookieConfig(expiresAt);
    c.header(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${sessionId}; HttpOnly; Path=${cookieConfig.path}; SameSite=${cookieConfig.sameSite}; Expires=${cookieConfig.expires.toUTCString()}${cookieConfig.secure ? '; Secure' : ''}`
    );

    return c.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      session: {
        expiresAt: expiresAt.toISOString(),
        rememberMe: rememberMe,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during login',
      },
      500
    );
  }
});

/**
 * POST /api/auth/logout
 * Logout the current user
 */
auth.post('/logout', async (c) => {
  try {
    // Get session ID from cookie
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);

    if (sessionId) {
      // Delete session from database
      await deleteSession(sessionId);
    }

    // Clear session cookie
    c.header(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );

    return c.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred during logout',
      },
      500
    );
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');

    return c.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while fetching user data',
      },
      500
    );
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
auth.post('/forgot-password', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validation = forgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'Validation failed',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { email } = validation.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent user enumeration
    // Even if user doesn't exist, we return 200
    if (!user || user.deletedAt) {
      return c.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email sending fails
      // In production, you might want to queue this for retry
    }

    return c.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while processing your request',
      },
      500
    );
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
auth.post('/reset-password', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          error: 'Validation failed',
          message: validation.error.errors[0].message,
        },
        400
      );
    }

    const { token, password } = validation.data;

    // Find user by reset token
    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user) {
      return c.json(
        {
          error: 'Invalid token',
          message: 'Password reset token is invalid or has expired',
        },
        400
      );
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return c.json(
        {
          error: 'Token expired',
          message: 'Password reset token has expired. Please request a new one.',
        },
        400
      );
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      return c.json(
        {
          error: 'Account inactive',
          message: 'This account has been deactivated',
        },
        400
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Optionally: Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return c.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while resetting your password',
      },
      500
    );
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
auth.post('/verify-email', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json(
        {
          error: 'Validation failed',
          message: 'Verification token is required',
        },
        400
      );
    }

    // Find user by verification token
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return c.json(
        {
          error: 'Invalid token',
          message: 'Email verification token is invalid or has expired',
        },
        400
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return c.json({
        success: true,
        message: 'Email is already verified',
      });
    }

    // Check if token has expired
    if (!user.emailVerifyExpires || user.emailVerifyExpires < new Date()) {
      return c.json(
        {
          error: 'Token expired',
          message: 'Email verification token has expired. Please request a new one.',
        },
        400
      );
    }

    // Check if user is soft-deleted
    if (user.deletedAt) {
      return c.json(
        {
          error: 'Account inactive',
          message: 'This account has been deactivated',
        },
        400
      );
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    return c.json({
      success: true,
      message: 'Email verified successfully! You now have full access to your account.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while verifying your email',
      },
      500
    );
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification
 */
auth.post('/resend-verification', authMiddleware, async (c) => {
  try {
    const currentUser = c.get('user');

    // Check if already verified
    if (currentUser.emailVerified) {
      return c.json(
        {
          error: 'Already verified',
          message: 'Your email is already verified',
        },
        400
      );
    }

    // Generate new verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date();
    verifyExpires.setHours(verifyExpires.getHours() + 24); // 24 hour expiry

    // Update user with new token
    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        emailVerifyToken: verifyToken,
        emailVerifyExpires: verifyExpires,
      },
    });

    // Send verification email
    try {
      await sendVerificationEmail(currentUser.email, currentUser.name, verifyToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return c.json(
        {
          error: 'Email send failed',
          message: 'Failed to send verification email. Please try again later.',
        },
        500
      );
    }

    return c.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: 'An error occurred while sending verification email',
      },
      500
    );
  }
});

export default auth;
