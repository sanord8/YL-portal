import { z } from 'zod';
import { router, protectedProcedure, verifiedProcedure, createPermissionProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '../../db/prisma';

/**
 * Get or create default role for user area assignments
 */
async function getDefaultRole() {
  // Try to find existing default role
  let role = await prisma.role.findFirst({
    where: { name: 'Default' },
  });

  // Create if doesn't exist
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'Default',
        description: 'Default role for area access',
      },
    });
  }

  return role;
}

/**
 * Area Router
 * CRUD operations for financial areas
 */
export const areaRouter = router({
  /**
   * List all areas accessible to the user
   * Admins see all areas, regular users see only their assigned areas
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Admins have access to all areas
    if (ctx.user.isAdmin) {
      const areas = await ctx.prisma.area.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              movements: true,
              userAreas: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
      return areas;
    }

    // Regular users only see their assigned areas
    const userAreas = await ctx.prisma.userArea.findMany({
      where: { userId: ctx.user.id },
      include: {
        area: {
          include: {
            _count: {
              select: {
                movements: true,
                userAreas: true,
              },
            },
          },
        },
      },
    });

    return userAreas.map((ua) => ua.area);
  }),

  /**
   * List all areas (admin only - for now, all authenticated users)
   * TODO: Add admin role check
   */
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const areas = await ctx.prisma.area.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            movements: true,
            userAreas: true,
            departments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return areas;
  }),

  /**
   * Get area by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const area = await ctx.prisma.area.findUnique({
        where: { id: input.id },
        include: {
          departments: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
          },
          userAreas: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              movements: true,
              departments: true,
            },
          },
        },
      });

      if (!area) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Area not found',
        });
      }

      // Admins have access to all areas
      if (!ctx.user.isAdmin) {
        // Check if user has access to this area
        const hasAccess = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: input.id,
          },
        });

        if (!hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this area',
          });
        }
      }

      return area;
    }),

  /**
   * Create new area
   * Requires area:create permission (typically admin only)
   */
  create: createPermissionProcedure('area', 'create')
    .input(
      z.object({
        name: z.string().min(1).max(100),
        code: z.string().min(1).max(10).toUpperCase(),
        description: z.string().max(500).optional(),
        currency: z.string().length(3).default('EUR'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if code already exists
      const existing = await ctx.prisma.area.findFirst({
        where: {
          code: input.code,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An area with this code already exists',
        });
      }

      // Get default role for assignment
      const defaultRole = await getDefaultRole();

      // Create area
      const area = await ctx.prisma.area.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description,
          currency: input.currency,
        },
      });

      // Automatically assign creator to the area
      await ctx.prisma.userArea.create({
        data: {
          userId: ctx.user.id,
          areaId: area.id,
          roleId: defaultRole.id,
        },
      });

      return area;
    }),

  /**
   * Update area
   * Requires area:update permission (typically admin only)
   */
  update: createPermissionProcedure('area', 'update')
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        code: z.string().min(1).max(10).toUpperCase().optional(),
        description: z.string().max(500).optional(),
        currency: z.string().length(3).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if area exists
      const existing = await ctx.prisma.area.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Area not found',
        });
      }

      // If updating code, check for conflicts
      if (data.code && data.code !== existing.code) {
        const codeExists = await ctx.prisma.area.findFirst({
          where: {
            code: data.code,
            id: { not: id },
            deletedAt: null,
          },
        });

        if (codeExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'An area with this code already exists',
          });
        }
      }

      // Update area
      const updated = await ctx.prisma.area.update({
        where: { id },
        data,
      });

      return updated;
    }),

  /**
   * Delete area (soft delete)
   * Requires area:delete permission (typically admin only)
   */
  delete: createPermissionProcedure('area', 'delete')
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if area exists
      const existing = await ctx.prisma.area.findUnique({
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
          message: 'Area not found',
        });
      }

      // Check if area has movements
      if (existing._count.movements > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Cannot delete area with existing movements',
        });
      }

      // Soft delete
      await ctx.prisma.area.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Assign user to area
   * Requires area:manage_users permission (typically admin only)
   */
  assignUser: createPermissionProcedure('area', 'manage_users')
    .input(
      z.object({
        areaId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Check if already assigned
      const existing = await ctx.prisma.userArea.findFirst({
        where: {
          userId: input.userId,
          areaId: input.areaId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already assigned to this area',
        });
      }

      // Get default role for assignment
      const defaultRole = await getDefaultRole();

      // Create assignment
      const assignment = await ctx.prisma.userArea.create({
        data: {
          userId: input.userId,
          areaId: input.areaId,
          roleId: defaultRole.id,
        },
      });

      return assignment;
    }),

  /**
   * Unassign user from area
   * Requires area:manage_users permission (typically admin only)
   */
  unassignUser: createPermissionProcedure('area', 'manage_users')
    .input(
      z.object({
        areaId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find assignment
      const assignment = await ctx.prisma.userArea.findFirst({
        where: {
          userId: input.userId,
          areaId: input.areaId,
        },
      });

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User is not assigned to this area',
        });
      }

      // Delete assignment
      await ctx.prisma.userArea.delete({
        where: {
          userId_areaId: {
            userId: input.userId,
            areaId: input.areaId,
          },
        },
      });

      return { success: true };
    }),
});
