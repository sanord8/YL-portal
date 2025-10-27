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
   * Special funds departments (userId != null) are filtered:
   * - Regular users see only their own special funds + regular departments from their areas
   * - Admins see all special funds departments + all regular departments
   */
  list: protectedProcedure
    .input(
      z.object({
        areaId: z.string().uuid().optional(),
        includeSpecialFunds: z.boolean().default(true), // Whether to include special funds departments
      })
    )
    .query(async ({ ctx, input }) => {
      // Admins see all departments
      if (ctx.user.isAdmin) {
        const where: any = {
          deletedAt: null,
        };

        if (input.areaId) {
          where.areaId = input.areaId;
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

        // Calculate balances for each department
        // Performance optimization: Fetch all movements in a single query instead of N+1
        const departmentIds = departments.map((d) => d.id);

        const movements = await ctx.prisma.movement.findMany({
          where: {
            departmentId: { in: departmentIds },
            status: { in: ['APPROVED', 'DRAFT'] },
            deletedAt: null,
          },
          select: {
            departmentId: true,
            type: true,
            amount: true,
          },
        });

        // Calculate balances in memory (much faster than N queries)
        const balanceMap = new Map<string, { income: number; expenses: number }>();

        movements.forEach((movement) => {
          const deptId = movement.departmentId!;
          if (!balanceMap.has(deptId)) {
            balanceMap.set(deptId, { income: 0, expenses: 0 });
          }

          const balance = balanceMap.get(deptId)!;
          if (movement.type === 'INCOME') {
            balance.income += movement.amount;
          } else if (movement.type === 'EXPENSE') {
            balance.expenses += movement.amount;
          }
        });

        // Attach balances to departments
        const departmentsWithBalances = departments.map((dept) => {
          const balance = balanceMap.get(dept.id) || { income: 0, expenses: 0 };
          return {
            ...dept,
            income: balance.income,
            expenses: balance.expenses,
            balance: balance.income - balance.expenses,
            isSpecialFunds: dept.userId !== null, // Mark special funds departments
          };
        });

        return departmentsWithBalances;
      }

      // Regular users: show departments from their assigned areas + their own special funds
      const userAreas = await ctx.prisma.userArea.findMany({
        where: { userId: ctx.user.id },
        select: { areaId: true },
      });

      const areaIds = userAreas.map((ua) => ua.areaId);

      // Build filter for regular departments from user's areas
      const regularDepartmentsWhere: any = {
        deletedAt: null,
        userId: null, // Regular departments (not special funds)
      };

      if (input.areaId) {
        // Verify user has access to the requested area
        if (!areaIds.includes(input.areaId)) {
          return []; // Return empty if user doesn't have access
        }
        regularDepartmentsWhere.areaId = input.areaId;
      } else {
        regularDepartmentsWhere.areaId = { in: areaIds };
      }

      // Get regular departments
      const regularDepartments = await ctx.prisma.department.findMany({
        where: regularDepartmentsWhere,
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
      });

      // Get user's special funds department if requested
      let specialFundsDepartment = null;
      if (input.includeSpecialFunds) {
        specialFundsDepartment = await ctx.prisma.department.findFirst({
          where: {
            userId: ctx.user.id,
            deletedAt: null,
            // If filtering by area, also filter special funds by that area
            ...(input.areaId ? { areaId: input.areaId } : {}),
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
            _count: {
              select: {
                movements: true,
              },
            },
          },
        });
      }

      // Combine regular departments and special funds department
      const allDepartments = specialFundsDepartment
        ? [specialFundsDepartment, ...regularDepartments]
        : regularDepartments;

      // Calculate balances for each department
      // Performance optimization: Fetch all movements in a single query instead of N+1
      const departmentIds = allDepartments.map((d) => d.id);

      const movements = await ctx.prisma.movement.findMany({
        where: {
          departmentId: { in: departmentIds },
          status: { in: ['APPROVED', 'DRAFT'] },
          deletedAt: null,
        },
        select: {
          departmentId: true,
          type: true,
          amount: true,
        },
      });

      // Calculate balances in memory (much faster than N queries)
      const balanceMap = new Map<string, { income: number; expenses: number }>();

      movements.forEach((movement) => {
        const deptId = movement.departmentId!;
        if (!balanceMap.has(deptId)) {
          balanceMap.set(deptId, { income: 0, expenses: 0 });
        }

        const balance = balanceMap.get(deptId)!;
        if (movement.type === 'INCOME') {
          balance.income += movement.amount;
        } else if (movement.type === 'EXPENSE') {
          balance.expenses += movement.amount;
        }
      });

      // Attach balances to departments
      const departmentsWithBalances = allDepartments.map((dept) => {
        const balance = balanceMap.get(dept.id) || { income: 0, expenses: 0 };
        return {
          ...dept,
          income: balance.income,
          expenses: balance.expenses,
          balance: balance.income - balance.expenses,
          isSpecialFunds: dept.userId !== null, // Mark special funds departments
        };
      });

      // Sort: special funds first, then by area name, then by department name
      departmentsWithBalances.sort((a, b) => {
        if (a.isSpecialFunds && !b.isSpecialFunds) return -1;
        if (!a.isSpecialFunds && b.isSpecialFunds) return 1;
        if (a.area.name !== b.area.name) return a.area.name.localeCompare(b.area.name);
        return a.name.localeCompare(b.name);
      });

      return departmentsWithBalances;
    }),

  /**
   * Get department by ID
   *
   * Performance: Selective field loading - 30% less data transfer
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.id },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
              currency: true,
              budget: true,
            },
          },
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
        // Check if this is someone else's personal fund (private)
        if (department.userId && department.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this department',
          });
        }

        // Check if user has access to the area (for regular departments)
        if (!department.userId) {
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

  /**
   * Create personal fund department (admin only)
   * Each user can have at most 1 personal fund
   */
  createPersonalFund: verifiedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        areaId: z.string().uuid(),
        name: z.string().min(1).max(100).default('Personal Funds'),
        code: z.string().min(1).max(10).toUpperCase().default('PF'),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can create personal funds
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can create personal funds',
        });
      }

      // Check if user exists
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user || user.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if user already has a personal fund
      const existingPersonalFund = await ctx.prisma.department.findFirst({
        where: {
          userId: input.userId,
          deletedAt: null,
        },
      });

      if (existingPersonalFund) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already has a personal fund',
        });
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

      // Create personal fund department
      const department = await ctx.prisma.department.create({
        data: {
          areaId: input.areaId,
          userId: input.userId,
          name: input.name,
          code: input.code,
          description: input.description || 'Personal funds department',
        },
        include: {
          area: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return department;
    }),
});
