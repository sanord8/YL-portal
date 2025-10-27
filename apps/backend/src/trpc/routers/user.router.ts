import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * User Router
 * Handles user profile operations
 */
export const userRouter = router({
  /**
   * Get current user's profile
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
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
   * Update current user's profile
   * Users can only update their own profile (not admin fields)
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, 'Name must be at least 2 characters').optional(),
        email: z.string().email('Invalid email address').optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Validate at least one field is being updated
      if (!input.name && !input.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one field must be provided for update',
        });
      }

      // If email is being updated, check for conflicts
      if (input.email) {
        const emailConflict = await ctx.prisma.user.findFirst({
          where: {
            email: input.email.toLowerCase(),
            NOT: { id: userId },
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
      if (input.name) data.name = input.name.trim();
      if (input.email) {
        data.email = input.email.toLowerCase();
        // Reset email verification if email changes
        data.emailVerified = false;
      }

      // Update user
      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true,
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),
});
