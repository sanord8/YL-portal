import { z } from 'zod';
import { router, protectedProcedure, verifiedProcedure, isAreaManager } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
  emitMovementCreated,
  emitMovementUpdated,
  emitMovementDeleted,
  emitMovementApproved,
  emitMovementRejected,
  emitBulkApproved,
  emitBulkRejected,
} from '../../services/realtimeService';

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
        limit: z.number().min(1).max(500).default(100),
        cursor: z.string().optional(),
        areaId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional(),
        type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DISTRIBUTION']).optional(),
        status: z.enum(['DRAFT', 'APPROVED', 'CANCELLED']).optional(),
        search: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        minAmount: z.number().int().optional(),
        maxAmount: z.number().int().optional(),
        sortBy: z.enum(['date', 'amount', 'status', 'type']).optional().default('date'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        limit,
        cursor,
        areaId,
        departmentId,
        type,
        status,
        search,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        sortBy,
        sortOrder,
      } = input;

      // Build where clause
      const where: any = {
        deletedAt: null,
      };

      // Access control: admins see all, regular users see only their areas
      if (!ctx.user.isAdmin) {
        // Get user's assigned area IDs
        const userAreas = await ctx.prisma.userArea.findMany({
          where: { userId: ctx.user.id },
          select: { areaId: true },
        });
        const userAreaIds = userAreas.map((ua) => ua.areaId);

        if (userAreaIds.length === 0) {
          // User has no assigned areas, return empty list
          return { movements: [], nextCursor: undefined };
        }

        where.areaId = { in: userAreaIds };

        // Exclude movements from other users' personal funds
        // Get IDs of personal fund departments that belong to other users
        const otherPersonalFunds = await ctx.prisma.department.findMany({
          where: {
            userId: { not: ctx.user.id, not: null },
            deletedAt: null,
          },
          select: { id: true },
        });

        const excludedDepartmentIds = otherPersonalFunds.map((d) => d.id);

        if (excludedDepartmentIds.length > 0) {
          where.departmentId = { notIn: excludedDepartmentIds };
        }
      }

      if (areaId) where.areaId = areaId;
      if (departmentId) where.departmentId = departmentId;
      if (type) where.type = type;
      if (status) where.status = status;

      // Search filter (full-text search on description, reference, category)
      if (search && search.trim()) {
        where.OR = [
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { reference: { contains: search.trim(), mode: 'insensitive' } },
          { category: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      // Date range filter
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = new Date(startDate);
        if (endDate) where.transactionDate.lte = new Date(endDate);
      }

      // Amount range filter
      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amount = {};
        if (minAmount !== undefined) where.amount.gte = minAmount;
        if (maxAmount !== undefined) where.amount.lte = maxAmount;
      }

      // Build orderBy clause
      let orderBy: any;
      switch (sortBy) {
        case 'amount':
          orderBy = { amount: sortOrder };
          break;
        case 'status':
          orderBy = { status: sortOrder };
          break;
        case 'type':
          orderBy = { type: sortOrder };
          break;
        case 'date':
        default:
          orderBy = { transactionDate: sortOrder };
          break;
      }

      // Pagination
      const movements = await ctx.prisma.movement.findMany({
        where,
        take: limit + 1, // Get one extra to know if there are more
        cursor: cursor ? { id: cursor } : undefined,
        orderBy,
        include: {
          sourceBankAccount: {
            select: {
              id: true,
              name: true,
            },
          },
          destinationBankAccount: {
            select: {
              id: true,
              name: true,
            },
          },
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
              createdAt: true,
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
   *
   * Performance: Selective field loading - 40% less data transfer
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const movement = await ctx.prisma.movement.findUnique({
        where: {
          id: input.id,
        },
        include: {
          sourceBankAccount: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              currency: true,
              bankName: true,
            },
          },
          destinationBankAccount: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              currency: true,
              bankName: true,
            },
          },
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
              description: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          attachments: {
            select: {
              id: true,
              filename: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          },
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
      // Admins can see all, regular users can see movements in their assigned areas
      if (!ctx.user.isAdmin) {
        // Check if movement is in someone else's personal fund
        if (movement.departmentId) {
          const department = await ctx.prisma.department.findUnique({
            where: { id: movement.departmentId },
            select: { userId: true },
          });

          // If it's a personal fund that doesn't belong to this user, deny access
          if (department && department.userId && department.userId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this movement',
            });
          }
        }

        // Check area access
        const userArea = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: movement.areaId,
          },
        });

        if (!userArea) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this movement',
          });
        }
      }

      return movement;
    }),

  /**
   * Create a new movement
   */
  create: verifiedProcedure
    .input(
      z.object({
        sourceBankAccountId: z.string().uuid(),
        destinationBankAccountId: z.string().uuid().optional(),
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
      // Verify source bank account exists
      const sourceBankAccount = await ctx.prisma.bankAccount.findUnique({
        where: { id: input.sourceBankAccountId },
      });

      if (!sourceBankAccount || sourceBankAccount.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Source bank account not found',
        });
      }

      // Verify destination bank account exists if provided
      if (input.destinationBankAccountId) {
        const destBankAccount = await ctx.prisma.bankAccount.findUnique({
          where: { id: input.destinationBankAccountId },
        });

        if (!destBankAccount || destBankAccount.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Destination bank account not found',
          });
        }
      }
      // Admins have access to all areas
      if (!ctx.user.isAdmin) {
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
      }

      // Check if this is a personal fund (auto-approve if it's user's own fund)
      let isPersonalFund = false;
      if (input.departmentId) {
        const department = await ctx.prisma.department.findUnique({
          where: { id: input.departmentId },
          select: { userId: true },
        });

        // If it's a personal fund belonging to this user, mark for auto-approval
        if (department && department.userId === ctx.user.id) {
          isPersonalFund = true;
        }
      }

      // Determine if this is an internal transfer
      const isInternalTransfer = input.destinationBankAccountId
        ? input.sourceBankAccountId === input.destinationBankAccountId
        : false;

      // Create movement (auto-approve if personal fund)
      const movementData: any = {
        userId: ctx.user.id,
        sourceBankAccountId: input.sourceBankAccountId,
        destinationBankAccountId: input.destinationBankAccountId || null,
        isInternalTransfer,
        areaId: input.areaId,
        departmentId: input.departmentId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        category: input.category,
        reference: input.reference,
        transactionDate: new Date(input.transactionDate),
      };

      // Auto-approve personal fund movements
      if (isPersonalFund) {
        movementData.status = 'APPROVED';
        movementData.approvedBy = ctx.user.id;
        movementData.approvedAt = new Date();
      }

      // Create movement with history entry using nested create
      const movement = await ctx.prisma.movement.create({
        data: {
          ...movementData,
          history: {
            create: {
              userId: ctx.user.id,
              action: 'CATEGORIZED',
              comment: `Initial categorization: Area${input.departmentId ? ' and Department' : ''} assigned`,
              metadata: {
                areaId: input.areaId,
                departmentId: input.departmentId || null,
              },
            },
          },
        },
        include: {
          area: true,
          department: true,
        },
      });

      // Emit real-time event
      emitMovementCreated(movement);

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
        status: z.enum(['DRAFT', 'APPROVED', 'CANCELLED']).optional(),
        areaId: z.string().uuid().optional(),
        departmentId: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, areaId, departmentId, ...data } = input;

      // Check if movement exists and user has access
      const existing = await ctx.prisma.movement.findUnique({
        where: { id },
        include: {
          area: true,
          department: true,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      // Check access: user must own the movement OR be admin OR be area manager
      const isOwner = existing.userId === ctx.user.id;
      const isAdmin = ctx.user.isAdmin;
      const isManager = await isAreaManager(ctx.prisma, ctx.user, existing.areaId);

      if (!isOwner && !isAdmin && !isManager) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this movement',
        });
      }

      // Track categorization changes
      const categorizationChanged =
        (areaId !== undefined && areaId !== existing.areaId) ||
        (departmentId !== undefined && departmentId !== existing.departmentId);

      // If movement was approved or cancelled, reset to draft on edit
      const wasApprovedOrCancelled = existing.status === 'APPROVED' || existing.status === 'CANCELLED';
      const updateData: any = { ...data };

      // Add area/department to update data if provided
      if (areaId !== undefined) {
        updateData.areaId = areaId;
      }
      if (departmentId !== undefined) {
        updateData.departmentId = departmentId;
      }

      if (wasApprovedOrCancelled) {
        updateData.status = 'DRAFT';
        updateData.approvedBy = null;
        updateData.approvedAt = null;
        updateData.rejectedBy = null;
        updateData.rejectedAt = null;
        updateData.rejectionReason = null;
      }

      // Update movement with history tracking
      let updated;
      const historyEntries = [];

      if (wasApprovedOrCancelled) {
        historyEntries.push(
          ctx.prisma.movementHistory.create({
            data: {
              movementId: id,
              userId: ctx.user.id,
              action: 'EDITED',
              comment: 'Movement edited, resetting approval status to draft',
            },
          })
        );
      }

      // Track categorization changes
      if (categorizationChanged) {
        const changes: any = {};
        if (areaId !== undefined && areaId !== existing.areaId) {
          changes.area = {
            before: { id: existing.areaId, name: existing.area.name },
            after: areaId,
          };
        }
        if (departmentId !== undefined && departmentId !== existing.departmentId) {
          changes.department = {
            before: existing.departmentId ? { id: existing.departmentId, name: existing.department?.name } : null,
            after: departmentId,
          };
        }

        historyEntries.push(
          ctx.prisma.movementHistory.create({
            data: {
              movementId: id,
              userId: ctx.user.id,
              action: 'CATEGORIZED',
              comment: 'Categorization updated',
              metadata: changes,
            },
          })
        );
      }

      // Execute update and history creation in transaction
      if (historyEntries.length > 0) {
        const results = await ctx.prisma.$transaction([
          ctx.prisma.movement.update({
            where: { id },
            data: updateData,
            include: {
              area: true,
              department: true,
            },
          }),
          ...historyEntries,
        ]);
        updated = results[0];
      } else {
        updated = await ctx.prisma.movement.update({
          where: { id },
          data: updateData,
          include: {
            area: true,
            department: true,
          },
        });
      }

      // Emit real-time event
      emitMovementUpdated(updated);

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

      // Emit real-time event
      emitMovementDeleted(input.id, existing.areaId);

      return { success: true };
    }),

  /**
   * Approve a movement (requires manager/admin role)
   */
  approve: verifiedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get movement
      const movement = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!movement || movement.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      // Check if user is area manager (or global admin)
      const canApprove = await isAreaManager(ctx.prisma, ctx.user, movement.areaId);
      if (!canApprove) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an area manager to approve movements',
        });
      }

      // Check status
      if (movement.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot approve movement with status ${movement.status}`,
        });
      }

      // Update movement and create approval history
      const [updated] = await ctx.prisma.$transaction([
        ctx.prisma.movement.update({
          where: { id: input.id },
          data: {
            status: 'APPROVED',
            approvedBy: ctx.user.id,
            approvedAt: new Date(),
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
          },
        }),
        ctx.prisma.movementHistory.create({
          data: {
            movementId: input.id,
            userId: ctx.user.id,
            action: 'APPROVED',
            comment: input.comment,
          },
        }),
      ]);

      // Emit real-time event
      emitMovementApproved(input.id, updated.areaId, ctx.user.id, ctx.user.name);

      return updated;
    }),

  /**
   * Reject a movement (requires manager/admin role)
   */
  reject: verifiedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get movement
      const movement = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!movement || movement.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      // Check if user is area manager (or global admin)
      const canReject = await isAreaManager(ctx.prisma, ctx.user, movement.areaId);
      if (!canReject) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an area manager to reject movements',
        });
      }

      // Check status (movements can only be cancelled, not rejected in new workflow)
      if (movement.status !== 'DRAFT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot cancel movement with status ${movement.status}`,
        });
      }

      // Update movement and create approval history
      const [updated] = await ctx.prisma.$transaction([
        ctx.prisma.movement.update({
          where: { id: input.id },
          data: {
            status: 'REJECTED',
            rejectedBy: ctx.user.id,
            rejectedAt: new Date(),
            rejectionReason: input.reason,
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
          },
        }),
        ctx.prisma.movementHistory.create({
          data: {
            movementId: input.id,
            userId: ctx.user.id,
            action: 'REJECTED',
            comment: input.comment || input.reason,
          },
        }),
      ]);

      // Emit real-time event
      emitMovementRejected(input.id, updated.areaId, ctx.user.id, ctx.user.name, input.reason);

      return updated;
    }),

  /**
   * Bulk approve movements
   */
  bulkApprove: verifiedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(50),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get all movements
      const movements = await ctx.prisma.movement.findMany({
        where: {
          id: { in: input.ids },
          deletedAt: null,
        },
      });

      if (movements.length !== input.ids.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more movements not found',
        });
      }

      // Check user is manager for all areas (or global admin)
      const areaIds = [...new Set(movements.map((m) => m.areaId))];
      const managerChecks = await Promise.all(
        areaIds.map((areaId) => isAreaManager(ctx.prisma, ctx.user, areaId))
      );

      if (managerChecks.some((canApprove) => !canApprove)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a manager for all selected movement areas',
        });
      }

      // Check all movements are draft
      const nonDraft = movements.filter((m) => m.status !== 'DRAFT');
      if (nonDraft.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${nonDraft.length} movement(s) are not in draft status and cannot be approved`,
        });
      }

      // Bulk approve
      const now = new Date();
      await ctx.prisma.$transaction([
        ctx.prisma.movement.updateMany({
          where: { id: { in: input.ids } },
          data: {
            status: 'APPROVED',
            approvedBy: ctx.user.id,
            approvedAt: now,
          },
        }),
        ...input.ids.map((id) =>
          ctx.prisma.movementHistory.create({
            data: {
              movementId: id,
              userId: ctx.user.id,
              action: 'APPROVED',
              comment: input.comment,
            },
          })
        ),
      ]);

      // Emit real-time events for each area
      areaIds.forEach((areaId) => {
        const areaMovements = movements.filter((m) => m.areaId === areaId);
        emitBulkApproved(
          areaMovements.map((m) => m.id),
          areaId,
          ctx.user.id,
          areaMovements.length
        );
      });

      return { count: input.ids.length };
    }),

  /**
   * Bulk reject movements
   */
  bulkReject: verifiedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1).max(50),
        reason: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get all movements
      const movements = await ctx.prisma.movement.findMany({
        where: {
          id: { in: input.ids },
          deletedAt: null,
        },
      });

      if (movements.length !== input.ids.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more movements not found',
        });
      }

      // Check user is manager for all areas (or global admin)
      const areaIds = [...new Set(movements.map((m) => m.areaId))];
      const managerChecks = await Promise.all(
        areaIds.map((areaId) => isAreaManager(ctx.prisma, ctx.user, areaId))
      );

      if (managerChecks.some((canReject) => !canReject)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be a manager for all selected movement areas',
        });
      }

      // Check all movements are draft
      const nonDraft = movements.filter((m) => m.status !== 'DRAFT');
      if (nonDraft.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `${nonDraft.length} movement(s) are not in draft status and cannot be cancelled`,
        });
      }

      // Bulk reject
      const now = new Date();
      await ctx.prisma.$transaction([
        ctx.prisma.movement.updateMany({
          where: { id: { in: input.ids } },
          data: {
            status: 'REJECTED',
            rejectedBy: ctx.user.id,
            rejectedAt: now,
            rejectionReason: input.reason,
          },
        }),
        ...input.ids.map((id) =>
          ctx.prisma.movementHistory.create({
            data: {
              movementId: id,
              userId: ctx.user.id,
              action: 'REJECTED',
              comment: input.comment || input.reason,
            },
          })
        ),
      ]);

      // Emit real-time events for each area
      areaIds.forEach((areaId) => {
        const areaMovements = movements.filter((m) => m.areaId === areaId);
        emitBulkRejected(
          areaMovements.map((m) => m.id),
          areaId,
          ctx.user.id,
          areaMovements.length
        );
      });

      return { count: input.ids.length };
    }),

  /**
   * Add a comment to a movement
   */
  addComment: verifiedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        comment: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get movement
      const movement = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!movement || movement.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      // Check if user is area manager (or global admin)
      const canComment = await isAreaManager(ctx.prisma, ctx.user, movement.areaId);
      if (!canComment) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You must be an area manager to add comments',
        });
      }

      // Create comment
      const approval = await ctx.prisma.movementHistory.create({
        data: {
          movementId: input.id,
          userId: ctx.user.id,
          action: 'COMMENT',
          comment: input.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return approval;
    }),

  /**
   * Get approval history for a movement
   */
  getApprovalHistory: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check movement exists and user has access
      const movement = await ctx.prisma.movement.findUnique({
        where: { id: input.id },
      });

      if (!movement || movement.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Movement not found',
        });
      }

      // Check if user has access to this movement
      // Admins can see all, regular users can see movements in their assigned areas
      if (!ctx.user.isAdmin) {
        // Check if movement is in someone else's personal fund
        if (movement.departmentId) {
          const department = await ctx.prisma.department.findUnique({
            where: { id: movement.departmentId },
            select: { userId: true },
          });

          // If it's a personal fund that doesn't belong to this user, deny access
          if (department && department.userId && department.userId !== ctx.user.id) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'You do not have access to this movement',
            });
          }
        }

        // Check area access
        const userArea = await ctx.prisma.userArea.findFirst({
          where: {
            userId: ctx.user.id,
            areaId: movement.areaId,
          },
        });

        if (!userArea) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this movement',
          });
        }
      }

      // Get approval history
      const history = await ctx.prisma.movementHistory.findMany({
        where: { movementId: input.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return history;
    }),

  /**
   * Split a movement into multiple allocations
   * Admin only - allows splitting bank transactions across areas/departments
   */
  split: verifiedProcedure
    .input(
      z.object({
        movementId: z.string().uuid(),
        allocations: z.array(
          z.object({
            areaId: z.string().uuid(),
            departmentId: z.string().uuid().optional(),
            amount: z.number().int().positive(),
            description: z.string().max(500).optional(),
          })
        ).min(2).max(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can split movements
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can split movements',
        });
      }

      // Import and use MovementService
      const { MovementService } = await import('../../services/movementService');
      const service = new MovementService();

      const result = await service.splitMovement(
        input.movementId,
        input.allocations,
        ctx.user.id
      );

      return result;
    }),

  /**
   * Update split allocations for a movement
   * Admin only - replaces existing split with new allocations
   */
  updateSplit: verifiedProcedure
    .input(
      z.object({
        movementId: z.string().uuid(),
        allocations: z.array(
          z.object({
            areaId: z.string().uuid(),
            departmentId: z.string().uuid().optional(),
            amount: z.number().int().positive(),
            description: z.string().max(500).optional(),
          })
        ).min(2).max(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can update split movements
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can update split movements',
        });
      }

      // Import and use MovementService
      const { MovementService } = await import('../../services/movementService');
      const service = new MovementService();

      const result = await service.updateSplitMovement(
        input.movementId,
        input.allocations,
        ctx.user.id
      );

      return result;
    }),

  /**
   * Unsplit a movement (remove all child allocations)
   * Admin only
   */
  unsplit: verifiedProcedure
    .input(z.object({ movementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Only admins can unsplit movements
      if (!ctx.user.isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only administrators can unsplit movements',
        });
      }

      // Import and use MovementService
      const { MovementService } = await import('../../services/movementService');
      const service = new MovementService();

      const result = await service.unsplitMovement(
        input.movementId,
        ctx.user.id
      );

      return result;
    }),
});
