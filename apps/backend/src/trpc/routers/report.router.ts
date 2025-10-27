import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Report Router
 * Generate financial reports and export data
 */
export const reportRouter = router({
  /**
   * Export movements with filtering
   * Returns movement data ready for Excel/CSV export
   */
  exportMovements: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        areaId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DISTRIBUTION']).optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Build where clause
      const where: any = {
        userId: ctx.user.id,
        deletedAt: null,
      };

      if (input.areaId) where.areaId = input.areaId;
      if (input.departmentId) where.departmentId = input.departmentId;
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;
      if (input.category) where.category = input.category;

      // Date range filter
      if (input.startDate || input.endDate) {
        where.transactionDate = {};
        if (input.startDate) where.transactionDate.gte = new Date(input.startDate);
        if (input.endDate) where.transactionDate.lte = new Date(input.endDate);
      }

      // Get movements
      const movements = await ctx.prisma.movement.findMany({
        where,
        include: {
          area: {
            select: {
              name: true,
              code: true,
              currency: true,
            },
          },
          department: {
            select: {
              name: true,
              code: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
      });

      // Format for export
      return movements.map((m) => ({
        id: m.id,
        date: m.transactionDate.toISOString().split('T')[0], // YYYY-MM-DD
        type: m.type,
        status: m.status,
        amount: m.amount / 100, // Convert cents to currency units
        currency: m.currency,
        description: m.description,
        category: m.category || '',
        reference: m.reference || '',
        area: m.area.name,
        areaCode: m.area.code,
        department: m.department?.name || '',
        departmentCode: m.department?.code || '',
        createdBy: m.user.name,
        createdAt: m.createdAt.toISOString().split('T')[0],
      }));
    }),

  /**
   * Get current balances per area
   */
  balances: protectedProcedure.query(async ({ ctx }) => {
    // Get user's accessible areas
    const userAreas = await ctx.prisma.userArea.findMany({
      where: {
        userId: ctx.user.id,
      },
      include: {
        area: true,
      },
    });

    const areaIds = userAreas.map((ua) => ua.areaId);

    // Calculate balances for each area
    const balances = await Promise.all(
      userAreas.map(async (userArea) => {
        // Get approved movements only
        const movements = await ctx.prisma.movement.findMany({
          where: {
            areaId: userArea.areaId,
            status: 'APPROVED',
            deletedAt: null,
          },
          select: {
            type: true,
            amount: true,
          },
        });

        let income = 0;
        let expenses = 0;

        movements.forEach((m) => {
          if (m.type === 'INCOME') {
            income += m.amount;
          } else if (m.type === 'EXPENSE') {
            expenses += m.amount;
          }
        });

        const balance = income - expenses;

        return {
          areaId: userArea.areaId,
          areaName: userArea.area.name,
          areaCode: userArea.area.code,
          currency: userArea.area.currency,
          income: income / 100,
          expenses: expenses / 100,
          balance: balance / 100,
        };
      })
    );

    return balances;
  }),

  /**
   * Get monthly income vs expense summary
   */
  monthlySummary: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(12), // Number of months to include
        areaId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get user's accessible areas
      const userAreas = await ctx.prisma.userArea.findMany({
        where: {
          userId: ctx.user.id,
        },
        select: {
          areaId: true,
        },
      });

      const areaIds = userAreas.map((ua) => ua.areaId);

      if (areaIds.length === 0) {
        return [];
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - input.months);

      // Build where clause
      const where: any = {
        areaId: input.areaId ? input.areaId : { in: areaIds },
        status: 'APPROVED',
        deletedAt: null,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Get movements
      const movements = await ctx.prisma.movement.findMany({
        where,
        select: {
          type: true,
          amount: true,
          transactionDate: true,
          area: {
            select: {
              currency: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'asc',
        },
      });

      // Group by month
      const monthlyData = new Map<string, { income: number; expenses: number; currency: string }>();

      movements.forEach((m) => {
        const month = m.transactionDate.toISOString().slice(0, 7); // YYYY-MM

        if (!monthlyData.has(month)) {
          monthlyData.set(month, {
            income: 0,
            expenses: 0,
            currency: m.area.currency,
          });
        }

        const data = monthlyData.get(month)!;

        if (m.type === 'INCOME') {
          data.income += m.amount;
        } else if (m.type === 'EXPENSE') {
          data.expenses += m.amount;
        }
      });

      // Convert to array and format
      return Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          income: data.income / 100,
          expenses: data.expenses / 100,
          net: (data.income - data.expenses) / 100,
          currency: data.currency,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }),

  /**
   * Get expense breakdown by category
   */
  categoryBreakdown: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        areaId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get user's accessible areas
      const userAreas = await ctx.prisma.userArea.findMany({
        where: {
          userId: ctx.user.id,
        },
        select: {
          areaId: true,
        },
      });

      const areaIds = userAreas.map((ua) => ua.areaId);

      if (areaIds.length === 0) {
        return [];
      }

      // Build where clause
      const where: any = {
        areaId: input.areaId ? input.areaId : { in: areaIds },
        type: 'EXPENSE',
        status: 'APPROVED',
        deletedAt: null,
      };

      // Date range filter
      if (input.startDate || input.endDate) {
        where.transactionDate = {};
        if (input.startDate) where.transactionDate.gte = new Date(input.startDate);
        if (input.endDate) where.transactionDate.lte = new Date(input.endDate);
      }

      // Get expenses
      const expenses = await ctx.prisma.movement.findMany({
        where,
        select: {
          category: true,
          amount: true,
          area: {
            select: {
              currency: true,
            },
          },
        },
      });

      // Group by category
      const categoryTotals = new Map<string, { amount: number; count: number; currency: string }>();
      let totalAmount = 0;

      expenses.forEach((e) => {
        const category = e.category || 'Uncategorized';

        if (!categoryTotals.has(category)) {
          categoryTotals.set(category, {
            amount: 0,
            count: 0,
            currency: e.area.currency,
          });
        }

        const data = categoryTotals.get(category)!;
        data.amount += e.amount;
        data.count += 1;
        totalAmount += e.amount;
      });

      // Convert to array and calculate percentages
      return Array.from(categoryTotals.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount / 100,
          count: data.count,
          percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
          currency: data.currency,
        }))
        .sort((a, b) => b.amount - a.amount); // Sort by amount descending
    }),

  /**
   * Get monthly expense report per user (Admin only)
   * Shows total expenses for each user grouped by month
   */
  monthlyUserExpenses: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        userId: z.string().uuid().optional(), // Optional: filter by specific user
      })
    )
    .query(async ({ ctx, input }) => {
      // Admin-only check
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can access this report',
        });
      }

      // Build date filter
      const dateFilter: any = {};
      if (input.startDate || input.endDate) {
        if (input.startDate) dateFilter.gte = new Date(input.startDate);
        if (input.endDate) dateFilter.lte = new Date(input.endDate);
      }

      // Get all users (or specific user)
      const userFilter: any = { deletedAt: null };
      if (input.userId) {
        userFilter.id = input.userId;
      }

      const users = await ctx.prisma.user.findMany({
        where: userFilter,
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Get expense data for each user
      const userReports = await Promise.all(
        users.map(async (user) => {
          const expenses = await ctx.prisma.movement.findMany({
            where: {
              userId: user.id,
              type: 'EXPENSE',
              status: 'APPROVED',
              deletedAt: null,
              ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
            },
            select: {
              amount: true,
              transactionDate: true,
              currency: true,
            },
          });

          // Group by month
          const monthlyTotals = new Map<string, { amount: number; count: number; currency: string }>();

          expenses.forEach((expense) => {
            const month = expense.transactionDate.toISOString().slice(0, 7); // YYYY-MM

            if (!monthlyTotals.has(month)) {
              monthlyTotals.set(month, {
                amount: 0,
                count: 0,
                currency: expense.currency,
              });
            }

            const data = monthlyTotals.get(month)!;
            data.amount += expense.amount;
            data.count += 1;
          });

          // Convert to array and sort by month
          const monthlyExpenses = Array.from(monthlyTotals.entries())
            .map(([month, data]) => ({
              month,
              totalExpenses: data.amount / 100,
              count: data.count,
              currency: data.currency,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

          // Calculate grand total
          const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0) / 100;
          const transactionCount = expenses.length;

          return {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            monthlyExpenses,
            grandTotal,
            transactionCount,
            currency: expenses[0]?.currency || 'EUR',
          };
        })
      );

      // Filter out users with no expenses
      return userReports.filter((report) => report.transactionCount > 0);
    }),

  /**
   * Get admin rundown - comprehensive executive summary (Admin only)
   * Includes top spenders, budget utilization, and spending trends
   */
  adminRundown: protectedProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Admin-only check
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can access this report',
        });
      }

      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Run queries in parallel for performance
      const [topSpendersData, budgetUtilizationData, trendsData, statsData] = await Promise.all([
        // 1. Top Spenders
        ctx.prisma.movement
          .groupBy({
            by: ['userId'],
            where: {
              type: 'EXPENSE',
              status: 'APPROVED',
              deletedAt: null,
              transactionDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            _sum: {
              amount: true,
            },
            _count: true,
          })
          .then(async (grouped) => {
            // Get user details
            const userIds = grouped.map((g) => g.userId);
            const users = await ctx.prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, name: true, email: true },
            });

            const userMap = new Map(users.map((u) => [u.id, u]));

            // Combine and sort
            return grouped
              .map((g, index) => {
                const user = userMap.get(g.userId);
                return {
                  userId: g.userId,
                  userName: user?.name || 'Unknown',
                  userEmail: user?.email || '',
                  totalExpenses: (g._sum.amount || 0) / 100,
                  transactionCount: g._count,
                  rank: 0, // Will be set after sorting
                };
              })
              .sort((a, b) => b.totalExpenses - a.totalExpenses)
              .slice(0, 10) // Top 10
              .map((item, index) => ({ ...item, rank: index + 1 }));
          }),

        // 2. Budget Utilization
        ctx.prisma.area.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            code: true,
            budget: true,
            currency: true,
          },
        }).then(async (areas) => {
          return Promise.all(
            areas.map(async (area) => {
              const expenses = await ctx.prisma.movement.aggregate({
                where: {
                  areaId: area.id,
                  type: 'EXPENSE',
                  status: 'APPROVED',
                  deletedAt: null,
                  transactionDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
                _sum: {
                  amount: true,
                },
              });

              const spent = (expenses._sum.amount || 0) / 100;
              const budget = area.budget ? area.budget / 100 : null;
              const remaining = budget !== null ? budget - spent : null;
              const utilizationPercent = budget && budget > 0 ? (spent / budget) * 100 : 0;

              return {
                areaId: area.id,
                areaName: area.name,
                areaCode: area.code,
                budget,
                spent,
                remaining,
                utilizationPercent,
                isOverBudget: budget !== null && spent > budget,
                currency: area.currency,
              };
            })
          );
        }),

        // 3. Spending Trends
        ctx.prisma.movement.findMany({
          where: {
            status: 'APPROVED',
            deletedAt: null,
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            type: true,
            amount: true,
            transactionDate: true,
          },
        }).then((movements) => {
          // Group by month
          const monthlyData = new Map<string, { income: number; expenses: number }>();

          movements.forEach((m) => {
            const month = m.transactionDate.toISOString().slice(0, 7); // YYYY-MM

            if (!monthlyData.has(month)) {
              monthlyData.set(month, { income: 0, expenses: 0 });
            }

            const data = monthlyData.get(month)!;

            if (m.type === 'INCOME') {
              data.income += m.amount;
            } else if (m.type === 'EXPENSE') {
              data.expenses += m.amount;
            }
          });

          // Convert to array and calculate trends
          const sortedMonths = Array.from(monthlyData.entries())
            .map(([month, data]) => ({
              month,
              income: data.income / 100,
              expenses: data.expenses / 100,
              net: (data.income - data.expenses) / 100,
            }))
            .sort((a, b) => a.month.localeCompare(b.month));

          // Calculate month-over-month changes
          const monthOverMonth = sortedMonths.map((current, index) => {
            const previous = index > 0 ? sortedMonths[index - 1] : null;
            const percentChange = previous && previous.expenses > 0
              ? ((current.expenses - previous.expenses) / previous.expenses) * 100
              : 0;

            return {
              month: current.month,
              expenses: current.expenses,
              income: current.income,
              net: current.net,
              percentChange,
            };
          });

          const totalIncome = sortedMonths.reduce((sum, m) => sum + m.income, 0);
          const totalExpenses = sortedMonths.reduce((sum, m) => sum + m.expenses, 0);
          const averageMonthlyExpense = sortedMonths.length > 0
            ? totalExpenses / sortedMonths.length
            : 0;

          // Simple projection: last month's trend
          const lastMonth = sortedMonths[sortedMonths.length - 1];
          const projectedMonthEnd = lastMonth ? lastMonth.expenses : averageMonthlyExpense;

          return {
            totalIncome,
            totalExpenses,
            netPosition: totalIncome - totalExpenses,
            monthOverMonth,
            averageMonthlyExpense,
            projectedMonthEnd,
          };
        }),

        // 4. Quick Stats
        Promise.all([
          ctx.prisma.user.count({ where: { deletedAt: null } }),
          ctx.prisma.user.count({
            where: {
              deletedAt: null,
              movements: {
                some: {
                  transactionDate: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
          }),
          ctx.prisma.movement.count({
            where: {
              status: 'APPROVED',
              deletedAt: null,
              transactionDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          }),
          ctx.prisma.movement.count({
            where: {
              status: 'DRAFT',
              deletedAt: null,
            },
          }),
        ]).then(([totalUsers, activeUsers, totalMovements, pendingApprovals]) => ({
          totalUsers,
          activeUsers,
          totalMovements,
          pendingApprovals,
        })),
      ]);

      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        topSpenders: topSpendersData,
        budgetUtilization: budgetUtilizationData,
        spendingTrends: trendsData,
        stats: statsData,
      };
    }),
});
