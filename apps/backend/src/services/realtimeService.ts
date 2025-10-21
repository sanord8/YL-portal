import { broadcastToAreas, RealtimeEvent } from './websocketService';

/**
 * Emit movement created event
 */
export function emitMovementCreated(movement: any) {
  const event: RealtimeEvent = {
    type: 'movement:created',
    data: {
      id: movement.id,
      areaId: movement.areaId,
      type: movement.type,
      status: movement.status,
      amount: movement.amount,
      currency: movement.currency,
      description: movement.description,
      transactionDate: movement.transactionDate,
      createdBy: movement.userId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([movement.areaId], event);
}

/**
 * Emit movement updated event
 */
export function emitMovementUpdated(movement: any) {
  const event: RealtimeEvent = {
    type: 'movement:updated',
    data: {
      id: movement.id,
      areaId: movement.areaId,
      status: movement.status,
      amount: movement.amount,
      description: movement.description,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([movement.areaId], event);
}

/**
 * Emit movement approved event
 */
export function emitMovementApproved(movementId: string, areaId: string, approverId: string, approverName: string) {
  const event: RealtimeEvent = {
    type: 'movement:approved',
    data: {
      movementId,
      areaId,
      approverId,
      approverName,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([areaId], event);
}

/**
 * Emit movement rejected event
 */
export function emitMovementRejected(
  movementId: string,
  areaId: string,
  rejecterId: string,
  rejecterName: string,
  reason?: string
) {
  const event: RealtimeEvent = {
    type: 'movement:rejected',
    data: {
      movementId,
      areaId,
      rejecterId,
      rejecterName,
      reason,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([areaId], event);
}

/**
 * Emit movement deleted event
 */
export function emitMovementDeleted(movementId: string, areaId: string) {
  const event: RealtimeEvent = {
    type: 'movement:deleted',
    data: {
      movementId,
      areaId,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([areaId], event);
}

/**
 * Emit balance updated event
 */
export function emitBalanceUpdated(areaId: string, balance: number, currency: string) {
  const event: RealtimeEvent = {
    type: 'balance:updated',
    data: {
      areaId,
      balance,
      currency,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([areaId], event);
}

/**
 * Emit bulk approval event
 */
export function emitBulkApproved(movementIds: string[], areaId: string, approverId: string, count: number) {
  const event: RealtimeEvent = {
    type: 'movement:bulk-approved',
    data: {
      movementIds,
      areaId,
      approverId,
      count,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([areaId], event);
}

/**
 * Emit bulk rejection event
 */
export function emitBulkRejected(movementIds: string[], areaId: string, rejecterId: string, count: number) {
  const event: RealtimeEvent = {
    type: 'movement:bulk-rejected',
    data: {
      movementIds,
      areaId,
      rejecterId,
      count,
    },
    timestamp: new Date().toISOString(),
  };

  broadcastToAreas([areaId], event);
}
