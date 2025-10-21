import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { hashPassword } from '../../services/authService';
import { TRPCError } from '@trpc/server';

/**
 * Admin Router
 * Full CRUD operations for user management
 * All routes require admin privileges
 */
export const adminRouter = router({
  users: router({
    /**
     * List all users with pagination and filtering
     */
    list: adminProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),
          pageSize: z.number().min(1).max(100).default(20),
          search: z.string().optional(),
          includeDeleted: z.boolean().default(false),
          isAdmin: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { page, pageSize, search, includeDeleted, isAdmin } = input;
        const skip = (page - 1) * pageSize;

        // Build where clause
        const where: any = {};

        if (!includeDeleted) {
          where.deletedAt = null;
        }

        if (isAdmin !== undefined) {
          where.isAdmin = isAdmin;
        }

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        // Get total count
        const total = await ctx.prisma.user.count({ where });

        // Get users
        const users = await ctx.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            emailVerified: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            _count: {
              select: {
                userAreas: true,
                movements: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        });

        return {
          users,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      }),

    /**
     * Get a single user by ID
     */
    getById: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const user = await ctx.prisma.user.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            emailVerified: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            userAreas: {
              select: {
                id: true,
                areaRole: true,
                area: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return user;
      }),

    /**
     * Create a new user
     */
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(2, 'Name must be at least 2 characters'),
          email: z.string().email('Invalid email address'),
          password: z.string().min(8, 'Password must be at least 8 characters'),
          isAdmin: z.boolean().default(false),
          emailVerified: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { name, email, password, isAdmin, emailVerified } = input;

        // Check if user already exists
        const existingUser = await ctx.prisma.user.findFirst({
          where: {
            email: email.toLowerCase(),
          },
        });

        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A user with this email already exists',
          });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await ctx.prisma.user.create({
          data: {
            name: name.trim(),
            email: email.toLowerCase(),
            passwordHash,
            isAdmin,
            emailVerified,
          },
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            emailVerified: true,
            createdAt: true,
          },
        });

        return user;
      }),

    /**
     * Update a user
     */
    update: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          name: z.string().min(2).optional(),
          email: z.string().email().optional(),
          isAdmin: z.boolean().optional(),
          emailVerified: z.boolean().optional(),
          twoFactorEnabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;

        // Check if user exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // If email is being updated, check for conflicts
        if (updates.email) {
          const emailConflict = await ctx.prisma.user.findFirst({
            where: {
              email: updates.email.toLowerCase(),
              NOT: { id },
            },
          });

          if (emailConflict) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'A user with this email already exists',
            });
          }
        }

        // Prepare update data
        const data: any = {};
        if (updates.name) data.name = updates.name.trim();
        if (updates.email) data.email = updates.email.toLowerCase();
        if (updates.isAdmin !== undefined) data.isAdmin = updates.isAdmin;
        if (updates.emailVerified !== undefined) data.emailVerified = updates.emailVerified;
        if (updates.twoFactorEnabled !== undefined) data.twoFactorEnabled = updates.twoFactorEnabled;

        // Update user
        const user = await ctx.prisma.user.update({
          where: { id },
          data,
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            emailVerified: true,
            twoFactorEnabled: true,
            updatedAt: true,
          },
        });

        return user;
      }),

    /**
     * Soft delete a user
     */
    delete: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user exists
        const user = await ctx.prisma.user.findUnique({
          where: { id: input.id },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        if (user.deletedAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is already deleted',
          });
        }

        // Prevent deleting yourself
        if (user.id === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You cannot delete your own account',
          });
        }

        // Soft delete
        await ctx.prisma.user.update({
          where: { id: input.id },
          data: { deletedAt: new Date() },
        });

        return { success: true };
      }),

    /**
     * Restore a soft-deleted user
     */
    restore: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        // Check if user exists
        const user = await ctx.prisma.user.findUnique({
          where: { id: input.id },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        if (!user.deletedAt) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is not deleted',
          });
        }

        // Restore
        const restored = await ctx.prisma.user.update({
          where: { id: input.id },
          data: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            updatedAt: true,
          },
        });

        return restored;
      }),

    /**
     * Reset a user's password
     */
    resetPassword: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          newPassword: z.string().min(8, 'Password must be at least 8 characters'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, newPassword } = input;

        // Check if user exists
        const user = await ctx.prisma.user.findUnique({
          where: { id },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Hash new password
        const passwordHash = await hashPassword(newPassword);

        // Update password and clear any password reset tokens
        await ctx.prisma.user.update({
          where: { id },
          data: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
          },
        });

        // Invalidate all user sessions for security
        await ctx.prisma.session.deleteMany({
          where: { userId: id },
        });

        return { success: true };
      }),

    /**
     * Toggle admin status
     */
    toggleAdmin: adminProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          isAdmin: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, isAdmin } = input;

        // Check if user exists
        const user = await ctx.prisma.user.findUnique({
          where: { id },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Prevent removing own admin status
        if (user.id === ctx.user.id && !isAdmin) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You cannot remove your own admin status',
          });
        }

        // Update admin status
        const updated = await ctx.prisma.user.update({
          where: { id },
          data: { isAdmin },
          select: {
            id: true,
            name: true,
            email: true,
            isAdmin: true,
            updatedAt: true,
          },
        });

        return updated;
      }),
  }),
});
