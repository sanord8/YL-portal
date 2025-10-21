import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * User Router
 * Operations for user management and search (for area/department assignment)
 */
export const userRouter = router({
  /**
   * List all users
   * TODO: Add pagination and admin role check
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            areas: true,
            movements: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return users;
  }),

  /**
   * Search users by name or email
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { email: { contains: input.query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
        },
        take: input.limit,
        orderBy: {
          name: 'asc',
        },
      });

      return users;
    }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          areas: {
            include: {
              area: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
          _count: {
            select: {
              movements: true,
            },
          },
        },
      });

      if (!user || user.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  /**
   * Get users not assigned to a specific area
   * Useful for showing available users in assignment modal
   */
  getUnassigned: protectedProcedure
    .input(z.object({ areaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get all users who are NOT assigned to this area
      const users = await ctx.prisma.user.findMany({
        where: {
          deletedAt: null,
          areas: {
            none: {
              areaId: input.areaId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return users;
    }),
});
