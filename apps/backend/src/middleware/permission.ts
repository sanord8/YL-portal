import { Context, Next } from 'hono';
import { checkPermission, checkAreaPermission } from '../services/permissionService';
import { prisma } from '../db/prisma';

/**
 * Hono middleware to require a specific permission
 * Use this for REST API routes that need permission checking
 *
 * @example
 * ```ts
 * app.post('/api/areas', requirePermission('area', 'create'), async (c) => {
 *   // Only users with area:create permission can access this route
 * });
 * ```
 */
export function requirePermission(
  resource: string,
  action: string,
  getContext?: (c: Context) => Record<string, any>
) {
  return async (c: Context, next: Next) => {
    // Get user from context (should be set by auth middleware)
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource',
        },
        401
      );
    }

    // Prepare context for ABAC evaluation
    const context = getContext ? getContext(c) : undefined;

    // Check permission
    const hasPermission = await checkPermission(
      user.id,
      resource,
      action,
      context,
      prisma
    );

    if (!hasPermission) {
      return c.json(
        {
          error: 'Forbidden',
          message: `You do not have permission to ${action} ${resource}`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Hono middleware to require an area-scoped permission
 *
 * @example
 * ```ts
 * app.post('/api/areas/:areaId/movements',
 *   requireAreaPermission('movement', 'create', (c) => c.req.param('areaId')),
 *   async (c) => {
 *     // Only users with movement:create permission in this area can access
 *   }
 * );
 * ```
 */
export function requireAreaPermission(
  resource: string,
  action: string,
  getAreaId: (c: Context) => string,
  getContext?: (c: Context) => Record<string, any>
) {
  return async (c: Context, next: Next) => {
    // Get user from context (should be set by auth middleware)
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource',
        },
        401
      );
    }

    // Extract area ID
    const areaId = getAreaId(c);

    if (!areaId) {
      return c.json(
        {
          error: 'Bad Request',
          message: 'Area ID is required for this operation',
        },
        400
      );
    }

    // Prepare context for ABAC evaluation
    const context = getContext ? getContext(c) : undefined;

    // Check area-scoped permission
    const hasPermission = await checkAreaPermission(
      user.id,
      areaId,
      resource,
      action,
      context,
      prisma
    );

    if (!hasPermission) {
      return c.json(
        {
          error: 'Forbidden',
          message: `You do not have permission to ${action} ${resource} in this area`,
        },
        403
      );
    }

    await next();
  };
}
