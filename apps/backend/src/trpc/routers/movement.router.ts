import { z } from 'zod';
import { router, protectedProcedure, verifiedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Movement Router
 * Type-safe API for financial movements
 */
export const movementRouter = router({
  /**
   * Get all movements for a user (paginated)
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        areaId: z.string().uuid().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DISTRIBUTION']).optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, areaId, type, status } = input;

      // Build where clause
      const where: any = {
        userId: ctx.user.id,
        deletedAt: null,
      };

      if (areaId) where.areaId = areaId;
      if (type) where.type = type;
      if (status) where.status = status;

      // Pagination
      const movements = await ctx.prisma.movement.findMany({
        where,
        take: limit + 1, // Get one extra to know if there are more
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          transactionDate: 'desc',
        },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
              currency: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              mimeType: true,
              size: true,
              url: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (movements.length > limit) {
        const nextItem = movements.pop(); // Remove extra item
        nextCursor = nextItem!.id;
      }

      return {
        movements,
        nextCursor,
      };
    }),

  /**
   * Get a single movement by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const movement = await ctx.prisma.movement.findUnique({
        where: {
          id: input.id,
        },
        include: {
          area: true,
          department: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          attachments: true,
          parent: {
            select: {
              id: true,
              amount: true,
              description: true,
            },
          },
          children: {
            select: {
              id: true,
              areaId: true,
              amount: true,
              description: true,
              area: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      });

      if (!movement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      // Check if user has access to this movement
      if (movement.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this movement',
        });
      }

      return movement;
    }),

  /**
   * Create a new movement
   */
  create: verifiedProcedure
    .input(
      z.object({
        areaId: z.string().uuid(),
        departmentId: z.string().uuid().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DISTRIBUTION']),
        amount: z.number().int().positive(), // Amount in cents
        currency: z.string().length(3).default('EUR'),
        description: z.string().min(1).max(500),
        category: z.string().optional(),
        reference: z.string().optional(),
        transactionDate: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to the area
      const userArea = await ctx.prisma.userArea.findFirst({
        where: {
          userId: ctx.user.id,
          areaId: input.areaId,
        },
      });

      if (!userArea) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this area',
        });
      }

      // Create movement
      const movement = await ctx.prisma.movement.create({
        data: {
          userId: ctx.user.id,
          areaId: input.areaId,
          departmentId: input.departmentId,
          type: input.type,
          amount: input.amount,
          currency: input.currency,
          description: input.description,
          category: input.category,
          reference: input.reference,
          transactionDate: new Date(input.transactionDate),
        },
        include: {
          area: true,
          department: true,
        },
      });

      return movement;
    }),

  /**
   * Update a movement
   */
  update: verifiedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        description: z.string().min(1).max(500).optional(),
        category: z.string().optional(),
        reference: z.string().optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if movement exists and user has access
      const existing = await ctx.prisma.movement.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      if (existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this movement',
        });
      }

      // Update movement
      const updated = await ctx.prisma.movement.update({
        where: { id },
        data,
        include: {
          area: true,
          department: true,
        },
      });

      return updated;
    }),

  /**
   * Delete a movement (soft delete)
   */
  delete: verifiedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if movement exists and user has access
      const existing = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      if (existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this movement',
        });
      }

      // Soft delete
      await ctx.prisma.movement.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});
