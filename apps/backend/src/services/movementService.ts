import { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';
import { prisma } from '../db/prisma';

export interface CreateMovementDTO {
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

      // Create movement
      const movement = await tx.movement.create({
        data: {
          areaId: data.areaId,
          departmentId: data.departmentId,
          userId: data.userId,
          type: data.type,
          status: 'PENDING',
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
}
