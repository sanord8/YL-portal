import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

/**
 * Draft Movement Router
 * Handles draft movements from bulk imports
 * - List drafts (with filters)
 * - Update draft fields (area, department, category)
 * - Bulk update
 * - Finalize draft (DRAFT → PENDING)
 * - Delete draft
 */
export const draftRouter = router({
  /**
   * List draft movements
   * Admins see all, users see only from their accessible areas
   */
  list: protectedProcedure
    .input(
      z.object({
        areaId: z.string().uuid().optional(),
        needsCategorization: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        status: 'DRAFT',
        deletedAt: null,
      };

      // Filter by area access
      if (!ctx.user.isAdmin) {
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });

        const areaIds = userAreas.map((ua) => ua.areaId);

        if (areaIds.length === 0) {
          return { drafts: [], nextCursor: undefined, total: 0 };
        }

        where.areaId = { in: areaIds };
      }

      // Apply filters
      if (input.areaId) {
        where.areaId = input.areaId;
      }

      if (input.needsCategorization) {
        where.departmentId = null;
      }

      // Cursor pagination
      if (input.cursor) {
        where.id = { lt: input.cursor };
      }

      // Get total count
      const total = await ctx.prisma.movement.count({ where });

      // Get drafts
      const drafts = await ctx.prisma.movement.findMany({
        where,
        take: input.limit + 1, // Take one extra to determine if there are more
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Determine next cursor
      let nextCursor: string | undefined = undefined;
      if (drafts.length > input.limit) {
        const nextItem = drafts.pop(); // Remove the extra item
        nextCursor = nextItem!.id;
      }

      return {
        drafts,
        nextCursor,
        total,
      };
    }),

  /**
   * Get draft by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const draft = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
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
        },
      });

      if (!draft || draft.deletedAt || draft.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Draft not found',
        });
      }

      // Check access
      if (!ctx.user.isAdmin) {
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: draft.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this draft',
          });
        }
      }

      return draft;
    }),

  /**
   * Update draft (inline editing)
   * Can only update: areaId, departmentId, category
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        areaId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional().nullable(),
        category: z.string().max(100).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Get existing draft
      const draft = await ctx.prisma.movement.findUnique({
        where: { id },
      });

      if (!draft || draft.deletedAt || draft.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Draft not found',
        });
      }

      // Check access to current area
      if (!ctx.user.isAdmin) {
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: draft.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this draft',
          });
        }
      }

      // If changing area, validate access to new area
      if (updates.areaId && updates.areaId !== draft.areaId) {
        const newArea = await ctx.prisma.area.findUnique({
          where: { id: updates.areaId },
        });

        if (!newArea || newArea.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'New area not found',
          });
        }

        if (!ctx.user.isAdmin) {
          const hasAccessToNewArea = await ctx.prisma.userArea.findFirst({
            where: {
              userId: ctx.user.id,
              areaId: updates.areaId,
            },
          });

          if (!hasAccessToNewArea) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to the new area',
            });
          }
        }
      }

      // If setting department, validate it belongs to the area
      if (updates.departmentId !== undefined) {
        if (updates.departmentId === null) {
          // Explicitly setting to null is OK (removes categorization)
        } else {
          const areaIdToCheck = updates.areaId || draft.areaId;
          const department = await ctx.prisma.department.findUnique({
            where: { id: updates.departmentId },
          });

          if (!department || department.deletedAt) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Department not found',
            });
          }

          if (department.areaId !== areaIdToCheck) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Department does not belong to the specified area',
            });
          }
        }
      }

      // Update draft
      const updated = await ctx.prisma.movement.update({
        where: { id },
        data: updates,
        include: {
          area: true,
          department: true,
        },
      });

      return updated;
    }),

  /**
   * Bulk update drafts
   * Admin only
   */
  bulkUpdate: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(100),
        areaId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional().nullable(),
        category: z.string().max(100).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can bulk update
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can perform bulk updates',
        });
      }

      const { ids, ...updates } = input;

      // Validate all drafts exist and are DRAFT status
      const drafts = await ctx.prisma.movement.findMany({
        where: {
          id: { in: ids },
          status: 'DRAFT',
          deletedAt: null,
        },
      });

      if (drafts.length !== ids.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Some drafts not found or not in DRAFT status',
        });
      }

      // Validate department if provided
      if (updates.departmentId && updates.departmentId !== null) {
        const department = await ctx.prisma.department.findUnique({
          where: { id: updates.departmentId },
        });

        if (!department || department.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Department not found',
          });
        }

        // If setting area too, ensure department belongs to that area
        if (updates.areaId && department.areaId !== updates.areaId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Department does not belong to the specified area',
          });
        }
      }

      // Perform bulk update
      const result = await ctx.prisma.movement.updateMany({
        where: { id: { in: ids } },
        data: updates,
      });

      return { updated: result.count };
    }),

  /**
   * Finalize draft (convert DRAFT → PENDING)
   */
  finalize: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get draft
      const draft = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!draft || draft.deletedAt || draft.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Draft not found',
        });
      }

      // Check access
      if (!ctx.user.isAdmin) {
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: draft.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this draft',
          });
        }
      }

      // Validate required fields
      if (!draft.departmentId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot finalize draft without department - please categorize first',
        });
      }

      // Update status to PENDING
      const finalized = await ctx.prisma.movement.update({
        where: { id: input.id },
        data: { status: 'PENDING' },
        include: {
          area: true,
          department: true,
        },
      });

      return finalized;
    }),

  /**
   * Bulk finalize drafts
   */
  bulkFinalize: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      // Get all drafts
      const drafts = await ctx.prisma.movement.findMany({
        where: {
          id: { in: input.ids },
          status: 'DRAFT',
          deletedAt: null,
        },
      });

      if (drafts.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No valid drafts found',
        });
      }

      // Check access for non-admins
      if (!ctx.user.isAdmin) {
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });
        const areaIds = userAreas.map((ua) => ua.areaId);

        const inaccessibleDrafts = drafts.filter(
          (d) => !areaIds.includes(d.areaId)
        );

        if (inaccessibleDrafts.length > 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to some of these drafts',
          });
        }
      }

      // Check all have departments
      const uncategorized = drafts.filter((d) => !d.departmentId);
      if (uncategorized.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot finalize ${uncategorized.length} draft(s) without department`,
        });
      }

      // Finalize all
      const result = await ctx.prisma.movement.updateMany({
        where: { id: { in: input.ids } },
        data: { status: 'PENDING' },
      });

      return { finalized: result.count };
    }),

  /**
   * Delete draft (soft delete)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get draft
      const draft = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!draft || draft.deletedAt || draft.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Draft not found',
        });
      }

      // Check access
      if (!ctx.user.isAdmin) {
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: draft.areaId,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this draft',
          });
        }
      }

      // Soft delete
      await ctx.prisma.movement.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Bulk delete drafts
   */
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      // Get all drafts
      const drafts = await ctx.prisma.movement.findMany({
        where: {
          id: { in: input.ids },
          status: 'DRAFT',
          deletedAt: null,
        },
      });

      if (drafts.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No valid drafts found',
        });
      }

      // Check access for non-admins
      if (!ctx.user.isAdmin) {
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });
        const areaIds = userAreas.map((ua) => ua.areaId);

        const inaccessibleDrafts = drafts.filter(
          (d) => !areaIds.includes(d.areaId)
        );

        if (inaccessibleDrafts.length > 0) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to some of these drafts',
          });
        }
      }

      // Soft delete all
      const result = await ctx.prisma.movement.updateMany({
        where: { id: { in: input.ids } },
        data: { deletedAt: new Date() },
      });

      return { deleted: result.count };
    }),

  /**
   * Get draft stats
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const where: any = {
      status: 'DRAFT',
      deletedAt: null,
    };

    // Filter by user areas if not admin
    if (!ctx.user.isAdmin) {
      const userAreas = await ctx.prisma.userArea.findMany({
        where: { userId: ctx.user.id },
        select: { areaId: true },
      });

      const areaIds = userAreas.map((ua) => ua.areaId);

      if (areaIds.length === 0) {
        return {
          total: 0,
          needsCategorization: 0,
          byArea: [],
        };
      }

      where.areaId = { in: areaIds };
    }

    // Total drafts
    const total = await ctx.prisma.movement.count({ where });

    // Needs categorization
    const needsCategorization = await ctx.prisma.movement.count({
      where: { ...where, departmentId: null },
    });

    // By area
    const byArea = await ctx.prisma.movement.groupBy({
      by: ['areaId'],
      where,
      _count: true,
    });

    // Get area details
    const areaIds = byArea.map((g) => g.areaId);
    const areas = await ctx.prisma.area.findMany({
      where: { id: { in: areaIds } },
      select: { id: true, name: true, code: true },
    });

    const byAreaWithDetails = byArea.map((g) => ({
      area: areas.find((a) => a.id === g.areaId)!,
      count: g._count,
    }));

    return {
      total,
      needsCategorization,
      byArea: byAreaWithDetails,
    };
  }),
});
