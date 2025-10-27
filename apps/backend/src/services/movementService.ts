import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';
import { TRPCError } from '@trpc/server';

export interface CreateMovementDTO {
  sourceBankAccountId: string;
  destinationBankAccountId?: string;
  areaId: string;
  departmentId?: string;
  userId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DISTRIBUTION';
  amount: number; // Amount in cents
  currency?: string;
  description: string;
  category?: string;
  reference?: string;
  transactionDate: Date;
  idempotencyKey?: string;
}

export interface SplitAllocation {
  areaId: string;
  departmentId?: string;
  amount: number; // Amount in cents
  description?: string;
}

/**
 * Movement service with ACID compliance and safety guards
 */
export class MovementService {
  /**
   * Create a new movement with transaction safety
   */
  async createMovement(data: CreateMovementDTO) {
    return await prisma.$transaction(async (tx) => {
      // Idempotency check
      if (data.idempotencyKey) {
        const existing = await tx.movement.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });

        if (existing) {
          return existing; // Return existing movement if duplicate
        }
      }

      // Verify area exists and user has access
      const userArea = await tx.userArea.findFirst({
        where: {
          userId: data.userId,
          areaId: data.areaId,
        },
      });

      if (!userArea) {
        throw new Error('User does not have access to this area');
      }

      // Determine if internal transfer
      const isInternalTransfer = data.destinationBankAccountId
        ? data.sourceBankAccountId === data.destinationBankAccountId
        : false;

      // Create movement
      const movement = await tx.movement.create({
        data: {
          sourceBankAccountId: data.sourceBankAccountId,
          destinationBankAccountId: data.destinationBankAccountId || null,
          isInternalTransfer,
          areaId: data.areaId,
          departmentId: data.departmentId,
          userId: data.userId,
          type: data.type,
          status: 'DRAFT',
          amount: data.amount,
          currency: data.currency || 'EUR',
          description: data.description,
          category: data.category,
          reference: data.reference,
          transactionDate: data.transactionDate,
          idempotencyKey: data.idempotencyKey,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: data.userId,
          action: 'CREATE',
          resource: 'movement',
          resourceId: movement.id,
          newValues: movement as unknown as Prisma.InputJsonValue,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return movement;
    });
  }

  /**
   * Distribute expense across multiple areas
   * Uses Banker's rounding for fairness
   */
  async distributeExpense(
    sourceMovementId: string,
    targetAreaIds: string[],
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Get source movement
      const sourceMovement = await tx.movement.findUnique({
        where: { id: sourceMovementId },
      });

      if (!sourceMovement) {
        throw new Error('Source movement not found');
      }

      if (sourceMovement.type !== 'EXPENSE') {
        throw new Error('Only expenses can be distributed');
      }

      // Calculate distribution amounts
      const totalAmount = new Decimal(sourceMovement.amount);
      const perAreaAmount = totalAmount.dividedBy(targetAreaIds.length);
      const baseAmount = perAreaAmount.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);

      // Handle remainder using largest remainder method
      const remainder = totalAmount.minus(baseAmount.times(targetAreaIds.length));

      const distributionId = crypto.randomUUID();
      const distributions = [];

      for (let i = 0; i < targetAreaIds.length; i++) {
        const areaId = targetAreaIds[i];
        let amount = baseAmount;

        // Distribute remainder to first areas
        if (i < remainder.toNumber()) {
          amount = amount.plus(1);
        }

        const distribution = await tx.movement.create({
          data: {
            areaId,
            userId,
            type: 'DISTRIBUTION',
            status: 'APPROVED',
            amount: amount.toNumber(),
            currency: sourceMovement.currency,
            description: `Distribution from: ${sourceMovement.description}`,
            parentId: sourceMovementId,
            distributionId,
            transactionDate: new Date(),
          },
        });

        distributions.push(distribution);
      }

      // Create audit log for distribution
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DISTRIBUTE',
          resource: 'movement',
          resourceId: sourceMovementId,
          newValues: {
            distributionId,
            targetAreas: targetAreaIds,
            distributions: distributions.map(d => ({ id: d.id, amount: d.amount })),
          } as unknown as Prisma.InputJsonValue,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return distributions;
    });
  }

  /**
   * Get movements with pagination
   */
  async getMovements(params: {
    areaId?: string;
    userId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit || 50;

    const movements = await prisma.movement.findMany({
      where: {
        areaId: params.areaId,
        userId: params.userId,
        deletedAt: null,
      },
      take: limit + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: { transactionDate: 'desc' },
      include: {
        sourceBankAccount: true,
        destinationBankAccount: true,
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

    const hasMore = movements.length > limit;
    const items = hasMore ? movements.slice(0, -1) : movements;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Split a movement into multiple child movements
   *
   * Example: A 10,000 EUR donation can be split into:
   * - 5,000 EUR to User A's personal fund
   * - 2,500 EUR to Area X
   * - 2,500 EUR to Area Y
   *
   * The parent movement remains visible with isSplitParent=true
   * Child movements reference the parent via parentId
   */
  async splitMovement(
    movementId: string,
    allocations: SplitAllocation[],
    userId: string
  ): Promise<{ parent: any; children: any[] }> {
    // Validate input
    if (allocations.length < 2) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Must split into at least 2 allocations',
      });
    }

    // Get the parent movement
    const parent = await prisma.movement.findUnique({
      where: { id: movementId },
      include: {
        sourceBankAccount: true,
        destinationBankAccount: true,
        area: true,
      },
    });

    if (!parent || parent.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Movement not found',
      });
    }

    // Check if already split
    if (parent.isSplitParent) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Movement is already split. Unsplit first to re-split.',
      });
    }

    // Check if this is a child movement
    if (parent.parentId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot split a child movement. Split the parent instead.',
      });
    }

    // Validate total allocation matches parent amount
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalAllocated !== parent.amount) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Total allocated amount (${totalAllocated}) must equal parent amount (${parent.amount})`,
      });
    }

    // Validate all areas exist
    for (const allocation of allocations) {
      const area = await prisma.area.findUnique({
        where: { id: allocation.areaId },
      });

      if (!area || area.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Area ${allocation.areaId} not found`,
        });
      }

      // Validate department if specified
      if (allocation.departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: allocation.departmentId },
        });

        if (!department || department.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Department ${allocation.departmentId} not found`,
          });
        }

        // Verify department belongs to area
        if (department.areaId !== allocation.areaId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Department ${allocation.departmentId} does not belong to area ${allocation.areaId}`,
          });
        }
      }
    }

    // Perform split in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark parent as split
      const updatedParent = await tx.movement.update({
        where: { id: movementId },
        data: {
          isSplitParent: true,
        },
        include: {
          sourceBankAccount: true,
          destinationBankAccount: true,
          area: true,
        },
      });

      // Create child movements
      const children = [];
      for (const allocation of allocations) {
        const child = await tx.movement.create({
          data: {
            sourceBankAccountId: parent.sourceBankAccountId,
            destinationBankAccountId: parent.destinationBankAccountId,
            isInternalTransfer: parent.isInternalTransfer,
            areaId: allocation.areaId,
            departmentId: allocation.departmentId,
            userId: parent.userId,
            type: parent.type,
            amount: allocation.amount,
            currency: parent.currency,
            description: allocation.description || `Split from: ${parent.description}`,
            category: parent.category,
            reference: parent.reference,
            transactionDate: parent.transactionDate,
            status: parent.status, // Inherit status from parent
            parentId: movementId,
          },
          include: {
            area: true,
            department: true,
          },
        });
        children.push(child);
      }

      // Create history entry
      await tx.movementHistory.create({
        data: {
          movementId,
          userId,
          action: 'SPLIT',
          comment: `Split into ${allocations.length} allocations`,
        },
      });

      return { parent: updatedParent, children };
    });

    return result;
  }

  /**
   * Update split allocations
   * Replaces existing child movements with new allocations
   */
  async updateSplitMovement(
    movementId: string,
    allocations: SplitAllocation[],
    userId: string
  ): Promise<{ parent: any; children: any[] }> {
    // Validate input
    if (allocations.length < 2) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Must split into at least 2 allocations',
      });
    }

    // Get the parent movement
    const parent = await prisma.movement.findUnique({
      where: { id: movementId },
      include: {
        sourceBankAccount: true,
        destinationBankAccount: true,
        area: true,
        children: true,
      },
    });

    if (!parent || parent.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Movement not found',
      });
    }

    // Check if this is a split parent
    if (!parent.isSplitParent) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Movement is not split. Use split endpoint instead.',
      });
    }

    // Check if this is a child movement
    if (parent.parentId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot update split on a child movement. Update the parent instead.',
      });
    }

    // Validate total allocation matches parent amount
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (totalAllocated !== parent.amount) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Total allocated amount (${totalAllocated}) must equal parent amount (${parent.amount})`,
      });
    }

    // Validate all areas exist
    for (const allocation of allocations) {
      const area = await prisma.area.findUnique({
        where: { id: allocation.areaId },
      });

      if (!area || area.deletedAt) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Area ${allocation.areaId} not found`,
        });
      }

      // Validate department if specified
      if (allocation.departmentId) {
        const department = await prisma.department.findUnique({
          where: { id: allocation.departmentId },
        });

        if (!department || department.deletedAt) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Department ${allocation.departmentId} not found`,
          });
        }

        // Verify department belongs to area
        if (department.areaId !== allocation.areaId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Department ${allocation.departmentId} does not belong to area ${allocation.areaId}`,
          });
        }
      }
    }

    // Perform update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing child movements
      await tx.movement.deleteMany({
        where: {
          parentId: movementId,
        },
      });

      // Get updated parent
      const updatedParent = await tx.movement.findUnique({
        where: { id: movementId },
        include: {
          sourceBankAccount: true,
          destinationBankAccount: true,
          area: true,
        },
      });

      if (!updatedParent) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Parent movement not found',
        });
      }

      // Create new child movements
      const children = [];
      for (const allocation of allocations) {
        const child = await tx.movement.create({
          data: {
            sourceBankAccountId: updatedParent.sourceBankAccountId,
            destinationBankAccountId: updatedParent.destinationBankAccountId,
            isInternalTransfer: updatedParent.isInternalTransfer,
            areaId: allocation.areaId,
            departmentId: allocation.departmentId,
            userId: updatedParent.userId,
            type: updatedParent.type,
            amount: allocation.amount,
            currency: updatedParent.currency,
            description: allocation.description || `Split from: ${updatedParent.description}`,
            category: updatedParent.category,
            reference: updatedParent.reference,
            transactionDate: updatedParent.transactionDate,
            status: updatedParent.status, // Inherit status from parent
            parentId: movementId,
          },
          include: {
            area: true,
            department: true,
          },
        });
        children.push(child);
      }

      // Create history entry
      await tx.movementHistory.create({
        data: {
          movementId,
          userId,
          action: 'SPLIT',
          comment: `Updated split allocations (${parent.children.length} → ${allocations.length} allocations)`,
        },
      });

      return { parent: updatedParent, children };
    });

    return result;
  }

  /**
   * Unsplit a movement (remove all child movements)
   * This reverses a split operation
   */
  async unsplitMovement(
    movementId: string,
    userId: string
  ): Promise<any> {
    // Get the parent movement
    const parent = await prisma.movement.findUnique({
      where: { id: movementId },
      include: {
        children: true,
      },
    });

    if (!parent || parent.deletedAt) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Movement not found',
      });
    }

    // Check if this is actually a split parent
    if (!parent.isSplitParent) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Movement is not split',
      });
    }

    // Perform unsplit in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete all child movements
      await tx.movement.deleteMany({
        where: {
          parentId: movementId,
        },
      });

      // Unmark parent as split
      const updatedParent = await tx.movement.update({
        where: { id: movementId },
        data: {
          isSplitParent: false,
        },
        include: {
          sourceBankAccount: true,
          destinationBankAccount: true,
          area: true,
        },
      });

      // Create history entry
      await tx.movementHistory.create({
        data: {
          movementId,
          userId,
          action: 'SPLIT',
          comment: `Unsplit movement (removed ${parent.children.length} allocations)`,
        },
      });

      return updatedParent;
    });

    return result;
  }
}
