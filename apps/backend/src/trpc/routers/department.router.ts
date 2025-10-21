import { z } from 'zod';
import { router, protectedProcedure, verifiedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Department Router
 * CRUD operations for departments within areas
 */
export const departmentRouter = router({
  /**
   * List all departments in user's accessible areas
   * Admins see all departments, regular users see only departments from their assigned areas
   */
  list: protectedProcedure
    .input(
      z.object({
        areaId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where: any = {
        deletedAt: null,
      };

      // If filtering by specific area
      if (input.areaId) {
        where.areaId = input.areaId;
      }

      // Regular users: only show departments from their assigned areas
      if (!ctx.user.isAdmin) {
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });

        const areaIds = userAreas.map((ua) => ua.areaId);

        // Add area filter only if not already filtered by specific area
        if (!input.areaId) {
          where.areaId = { in: areaIds };
        } else {
          // Verify user has access to the requested area
          if (!areaIds.includes(input.areaId)) {
            return []; // Return empty if user doesn't have access
          }
        }
      }

      const departments = await ctx.prisma.department.findMany({
        where,
        include: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
              currency: true,
            },
          },
          _count: {
            select: {
              movements: true,
            },
          },
        },
        orderBy: [
          { area: { name: 'asc' } },
          { name: 'asc' },
        ],
      });

      // Calculate balances for each department (APPROVED + PENDING movements)
      const departmentsWithBalances = await Promise.all(
        departments.map(async (dept) => {
          // Get income
          const incomeResult = await ctx.prisma.movement.aggregate({
            where: {
              departmentId: dept.id,
              type: 'INCOME',
              status: { in: ['APPROVED', 'PENDING'] },
              deletedAt: null,
            },
            _sum: { amount: true },
          });

          // Get expenses
          const expenseResult = await ctx.prisma.movement.aggregate({
            where: {
              departmentId: dept.id,
              type: 'EXPENSE',
              status: { in: ['APPROVED', 'PENDING'] },
              deletedAt: null,
            },
            _sum: { amount: true },
          });

          const income = incomeResult._sum.amount || 0;
          const expenses = expenseResult._sum.amount || 0;
          const balance = income - expenses;

          return {
            ...dept,
            income,
            expenses,
            balance,
          };
        })
      );

      return departmentsWithBalances;
    }),

  /**
   * Get department by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.id },
        include: {
          area: true,
          _count: {
            select: {
              movements: true,
            },
          },
        },
      });

      if (!department || department.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Department not found',
        });
      }

      // Admins have access to all departments
      if (!ctx.user.isAdmin) {
        // Check if user has access to the area
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: department.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this department',
          });
        }
      }

      // Calculate balance (APPROVED + PENDING movements)
      const incomeResult = await ctx.prisma.movement.aggregate({
        where: {
          departmentId: department.id,
          type: 'INCOME',
          status: { in: ['APPROVED', 'PENDING'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      });

      const expenseResult = await ctx.prisma.movement.aggregate({
        where: {
          departmentId: department.id,
          type: 'EXPENSE',
          status: { in: ['APPROVED', 'PENDING'] },
          deletedAt: null,
        },
        _sum: { amount: true },
      });

      const income = incomeResult._sum.amount || 0;
      const expenses = expenseResult._sum.amount || 0;
      const balance = income - expenses;

      return {
        ...department,
        income,
        expenses,
        balance,
      };
    }),

  /**
   * Create new department
   * TODO: Restrict to admin users or area managers
   */
  create: verifiedProcedure
    .input(
      z.object({
        areaId: z.string().uuid(),
        name: z.string().min(1).max(100),
        code: z.string().min(1).max(10).toUpperCase(),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Admins have access to all areas
      if (!ctx.user.isAdmin) {
        // Check if user has access to the area
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: input.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this area',
          });
        }
      }

      // Check if area exists
      const area = await ctx.prisma.area.findUnique({
        where: { id: input.areaId },
      });

      if (!area || area.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Area not found',
        });
      }

      // Check if code already exists in this area
      const existing = await ctx.prisma.department.findFirst({
        where: {
          areaId: input.areaId,
          code: input.code,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A department with this code already exists in this area',
        });
      }

      // Create department
      const department = await ctx.prisma.department.create({
        data: {
          areaId: input.areaId,
          name: input.name,
          code: input.code,
          description: input.description,
        },
        include: {
          area: true,
        },
      });

      return department;
    }),

  /**
   * Update department
   * TODO: Restrict to admin users or area managers
   */
  update: verifiedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        code: z.string().min(1).max(10).toUpperCase().optional(),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if department exists
      const existing = await ctx.prisma.department.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Department not found',
        });
      }

      // Admins have access to all departments
      if (!ctx.user.isAdmin) {
        // Check if user has access to the area
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: existing.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this department',
          });
        }
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const codeExists = await ctx.prisma.department.findFirst({
          where: {
            areaId: existing.areaId,
            code: data.code,
            id: { not: id },
            deletedAt: null,
          },
        });

        if (codeExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A department with this code already exists in this area',
          });
        }
      }

      // Update department
      const updated = await ctx.prisma.department.update({
        where: { id },
        data,
        include: {
          area: true,
        },
      });

      return updated;
    }),

  /**
   * Delete department (soft delete)
   * TODO: Restrict to admin users or area managers
   */
  delete: verifiedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if department exists
      const existing = await ctx.prisma.department.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              movements: true,
            },
          },
        },
      });

      if (!existing || existing.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Department not found',
        });
      }

      // Admins have access to all departments
      if (!ctx.user.isAdmin) {
        // Check if user has access to the area
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: existing.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this department',
          });
        }
      }

      // Check if department has movements
      if (existing._count.movements > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete department with existing movements',
        });
      }

      // Soft delete
      await ctx.prisma.department.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});
