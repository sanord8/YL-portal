import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/trpc';

/**
 * Type-safe tRPC client for frontend
 * Automatically infers types from backend AppRouter
 */
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      credentials: 'include', // Send cookies with requests

      // Optional: Add custom headers
      headers() {
        return {
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
});

/**
 * Usage example:
 *
 * // List movements with pagination
 * const { movements, nextCursor } = await trpc.movement.list.query({
 *   limit: 20,
 *   areaId: 'some-uuid',
 * });
 *
 * // Get movement by ID
 * const movement = await trpc.movement.getById.query({ id: 'some-uuid' });
 *
 * // Create new movement
 * const newMovement = await trpc.movement.create.mutate({
 *   areaId: 'some-uuid',
 *   type: 'EXPENSE',
 *   amount: 5000, // in cents
 *   description: 'Office supplies',
 *   transactionDate: new Date().toISOString(),
 * });
 *
 * // Update movement
 * await trpc.movement.update.mutate({
 *   id: 'some-uuid',
 *   description: 'Updated description',
 *   status: 'APPROVED',
 * });
 *
 * // Delete movement
 * await trpc.movement.delete.mutate({ id: 'some-uuid' });
 */
