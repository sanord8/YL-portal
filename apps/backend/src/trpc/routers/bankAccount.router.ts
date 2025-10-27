import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Bank Account Router
 * Manages bank accounts (Catalunya, Madrid, Andalucia, etc.)
 * Bank accounts are the core financial entities that areas belong to
 */
export const bankAccountRouter = router({
  /**
   * List all bank accounts
   * Available to all authenticated users (they need to see which accounts exist)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const bankAccounts = await ctx.prisma.bankAccount.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            areas: true,
            sourceMovements: true,
            destinationMovements: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return bankAccounts;
  }),

  /**
   * Get bank account by ID
   * Available to all authenticated users
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const bankAccount = await ctx.prisma.bankAccount.findUnique({
        where: { id: input.id },
        include: {
          areas: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: {
              sourceMovements: true,
              destinationMovements: true,
            },
          },
        },
      });

      if (!bankAccount || bankAccount.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bank account not found',
        });
      }

      return bankAccount;
    }),

  /**
   * Create new bank account
   * Admin only - bank accounts are critical infrastructure
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        accountNumber: z.string().max(50).optional(),
        bankName: z.string().max(100).optional(),
        currency: z.string().length(3).default('EUR'),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if bank account with this name already exists
      const existing = await ctx.prisma.bankAccount.findFirst({
        where: {
          name: input.name,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A bank account with this name already exists',
        });
      }

      // Create bank account
      const bankAccount = await ctx.prisma.bankAccount.create({
        data: {
          name: input.name,
          accountNumber: input.accountNumber,
          bankName: input.bankName,
          currency: input.currency,
          description: input.description,
        },
      });

      return bankAccount;
    }),

  /**
   * Update bank account
   * Admin only
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        accountNumber: z.string().max(50).optional().nullable(),
        bankName: z.string().max(100).optional().nullable(),
        currency: z.string().length(3).optional(),
        description: z.string().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if bank account exists
      const existing = await ctx.prisma.bankAccount.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bank account not found',
        });
      }

      // If updating name, check for conflicts
      if (data.name && data.name !== existing.name) {
        const nameExists = await ctx.prisma.bankAccount.findFirst({
          where: {
            name: data.name,
            id: { not: id },
            deletedAt: null,
          },
        });

        if (nameExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A bank account with this name already exists',
          });
        }
      }

      // Update bank account
      const updated = await ctx.prisma.bankAccount.update({
        where: { id },
        data,
      });

      return updated;
    }),

  /**
   * Delete bank account (soft delete)
   * Admin only
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if bank account exists
      const existing = await ctx.prisma.bankAccount.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              areas: true,
              sourceMovements: true,
              destinationMovements: true,
            },
          },
        },
      });

      if (!existing || existing.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bank account not found',
        });
      }

      // Check if bank account has areas
      if (existing._count.areas > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete bank account with existing areas. Please reassign or delete areas first.',
        });
      }

      // Check if bank account has movements
      if (existing._count.sourceMovements > 0 || existing._count.destinationMovements > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete bank account with existing movements',
        });
      }

      // Soft delete
      await ctx.prisma.bankAccount.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});
