import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

/**
 * Dashboard Router
 * Provides aggregated data for dashboard visualizations
 */
export const dashboardRouter = router({
  /**
   * Get overview statistics
   * Returns: total income, total expenses, pending count, areas count
   * Admins see stats across ALL areas, regular users see only their assigned areas
   */
  getOverviewStats: protectedProcedure.query(async ({ ctx }) => {
    let areaIds: string[];

    if (ctx.user.isAdmin) {
      // Admins see all areas
      const allAreas = await ctx.prisma.area.findMany({
        where: { deletedAt: null },
        select: { id: true },
      });
      areaIds = allAreas.map((a) => a.id);
    } else {
      // Regular users see only their assigned areas
      const userAreas = await ctx.prisma.userArea.findMany({
        where: { userId: ctx.user.id },
        select: { areaId: true },
      });
      areaIds = userAreas.map((ua) => ua.areaId);
    }

    // Get total income (approved only)
    const incomeResult = await ctx.prisma.movement.aggregate({
      where: {
        areaId: { in: areaIds },
        type: 'INCOME',
        status: 'APPROVED',
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    // Get total expenses (approved only)
    const expenseResult = await ctx.prisma.movement.aggregate({
      where: {
        areaId: { in: areaIds },
        type: 'EXPENSE',
        status: 'APPROVED',
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    // Get pending movements count
    const pendingCount = await ctx.prisma.movement.count({
      where: {
        areaId: { in: areaIds },
        status: 'PENDING',
        deletedAt: null,
      },
    });

    const totalIncome = incomeResult._sum.amount || 0;
    const totalExpenses = expenseResult._sum.amount || 0;
    const balance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      balance,
      pendingCount,
      areasCount: areaIds.length,
    };
  }),

  /**
   * Get balances per area
   * Returns array of areas with their current balances
   * Admins see ALL areas, regular users see only their assigned areas
   */
  getBalances: protectedProcedure.query(async ({ ctx }) => {
    let areas: Array<{ id: string; name: string; code: string; currency: string }>;
    let areaIds: string[];

    if (ctx.user.isAdmin) {
      // Admins see all areas
      areas = await ctx.prisma.area.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          code: true,
          currency: true,
        },
      });
      areaIds = areas.map((a) => a.id);
    } else {
      // Regular users see only their assigned areas
      const userAreas = await ctx.prisma.userArea.findMany({
        where: { userId: ctx.user.id },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
              currency: true,
            },
          },
        },
      });
      areas = userAreas.map((ua) => ua.area);
      areaIds = userAreas.map((ua) => ua.areaId);
    }

    // Get movements grouped by area
    const movements = await ctx.prisma.movement.findMany({
      where: {
        areaId: { in: areaIds },
        status: 'APPROVED',
        deletedAt: null,
      },
      select: {
        areaId: true,
        type: true,
        amount: true,
      },
    });

    // Calculate balance for each area
    const areaBalances = areas.map((area) => {
      const areaMovements = movements.filter((m) => m.areaId === area.id);

      const income = areaMovements
        .filter((m) => m.type === 'INCOME')
        .reduce((sum, m) => sum + m.amount, 0);

      const expenses = areaMovements
        .filter((m) => m.type === 'EXPENSE')
        .reduce((sum, m) => sum + m.amount, 0);

      const balance = income - expenses;

      return {
        area,
        income,
        expenses,
        balance,
      };
    });

    return areaBalances;
  }),

  /**
   * Get recent movements
   * Returns latest movements across all user areas
   * Admins see movements from ALL areas, regular users see only their assigned areas
   */
  getRecentMovements: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      let areaIds: string[];

      if (ctx.user.isAdmin) {
        // Admins see all areas
        const allAreas = await ctx.prisma.area.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });
        areaIds = allAreas.map((a) => a.id);
      } else {
        // Regular users see only their assigned areas
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });
        areaIds = userAreas.map((ua) => ua.areaId);
      }

      const movements = await ctx.prisma.movement.findMany({
        where: {
          areaId: { in: areaIds },
          deletedAt: null,
        },
        take: input.limit,
        orderBy: {
          transactionDate: 'desc',
        },
        include: {
          area: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      return movements;
    }),

  /**
   * Get expense breakdown by category
   * Returns expenses grouped by category with percentages
   * Admins see expenses from ALL areas, regular users see only their assigned areas
   */
  getExpenseBreakdown: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      let areaIds: string[];

      if (ctx.user.isAdmin) {
        // Admins see all areas
        const allAreas = await ctx.prisma.area.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });
        areaIds = allAreas.map((a) => a.id);
      } else {
        // Regular users see only their assigned areas
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });
        areaIds = userAreas.map((ua) => ua.areaId);
      }

      // Calculate date range
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - input.months);

      // Get all expenses in date range
      const expenses = await ctx.prisma.movement.findMany({
        where: {
          areaId: { in: areaIds },
          type: 'EXPENSE',
          status: 'APPROVED',
          deletedAt: null,
          transactionDate: {
            gte: startDate,
          },
        },
        select: {
          category: true,
          amount: true,
        },
      });

      // Group by category
      const categoryMap = new Map<string, number>();
      let totalExpenses = 0;

      expenses.forEach((expense) => {
        const category = expense.category || 'Uncategorized';
        const currentAmount = categoryMap.get(category) || 0;
        categoryMap.set(category, currentAmount + expense.amount);
        totalExpenses += expense.amount;
      });

      // Convert to array with percentages
      const breakdown = Array.from(categoryMap.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }));

      // Sort by amount descending
      breakdown.sort((a, b) => b.amount - a.amount);

      return {
        breakdown,
        total: totalExpenses,
      };
    }),

  /**
   * Get income vs expense trend
   * Returns monthly income and expenses for chart visualization
   * Admins see trends from ALL areas, regular users see only their assigned areas
   */
  getIncomeVsExpense: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      let areaIds: string[];

      if (ctx.user.isAdmin) {
        // Admins see all areas
        const allAreas = await ctx.prisma.area.findMany({
          where: { deletedAt: null },
          select: { id: true },
        });
        areaIds = allAreas.map((a) => a.id);
      } else {
        // Regular users see only their assigned areas
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });
        areaIds = userAreas.map((ua) => ua.areaId);
      }

      // Calculate date range
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - input.months);

      // Get all movements in date range
      const movements = await ctx.prisma.movement.findMany({
        where: {
          areaId: { in: areaIds },
          type: { in: ['INCOME', 'EXPENSE'] },
          status: 'APPROVED',
          deletedAt: null,
          transactionDate: {
            gte: startDate,
          },
        },
        select: {
          type: true,
          amount: true,
          transactionDate: true,
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      // Group by month
      const monthlyData = new Map<
        string,
        { month: string; income: number; expenses: number }
      >();

      movements.forEach((movement) => {
        const date = new Date(movement.transactionDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, {
            month: monthKey,
            income: 0,
            expenses: 0,
          });
        }

        const data = monthlyData.get(monthKey)!;
        if (movement.type === 'INCOME') {
          data.income += movement.amount;
        } else {
          data.expenses += movement.amount;
        }
      });

      // Convert to array and ensure all months are present
      const result: Array<{ month: string; income: number; expenses: number }> = [];
      const currentDate = new Date();

      for (let i = input.months - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(currentDate.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const existingData = monthlyData.get(monthKey);
        result.push(
          existingData || {
            month: monthKey,
            income: 0,
            expenses: 0,
          }
        );
      }

      return result;
    }),
});
