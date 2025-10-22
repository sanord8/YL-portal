import { initTRPC, TRPCError } from '@trpc/server';
import { TRPCContext } from './context';
import { checkPermission, checkAreaPermission } from '../services/permissionService';

/**
 * Initialize tRPC
 */
const t = initTRPC.context<TRPCContext>().create();

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type-safe: user is guaranteed to exist
    },
  });
});

/**
 * Verified email procedure - requires authentication + verified email
 */
export const verifiedProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.user.emailVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must verify your email to access this resource',
    });
  }

  return opts.next({
    ctx,
  });
});

/**
 * Admin procedure - requires authentication + isAdmin flag
 */
export const adminProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  // Check isAdmin from context (already loaded from session)
  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return opts.next({
    ctx,
  });
});

/**
 * Helper function to check if user has manager/admin role in an area
 * Global admins (isAdmin: true) automatically have manager permissions for all areas
 */
export async function isAreaManager(
  prisma: TRPCContext['prisma'],
  user: { id: string; isAdmin: boolean },
  areaId: string
): Promise<boolean> {
  // Global admins have manager permissions for all areas
  if (user.isAdmin) {
    return true;
  }

  // Otherwise check for explicit area assignment with manager/admin role
  const userArea = await prisma.userArea.findFirst({
    where: {
      userId: user.id,
      areaId,
      areaRole: {
        in: ['MANAGER', 'ADMIN'],
      },
    },
  });

  return !!userArea;
}

// ============================================
// PERMISSION-BASED PROCEDURES
// ============================================

/**
 * Create a procedure that requires a specific permission
 * @param resource - The resource type (e.g., "movement", "area", "user")
 * @param action - The action (e.g., "create", "read", "update", "delete")
 * @param context - Optional context for ABAC conditions
 */
export function createPermissionProcedure(
  resource: string,
  action: string,
  getContext?: (input: any) => Record<string, any>
) {
  return protectedProcedure.use(async (opts) => {
    const { ctx, input } = opts;

    // Prepare context for ABAC evaluation
    const context = getContext ? getContext(input) : undefined;

    // Check permission
    const hasPermission = await checkPermission(
      ctx.user.id,
      resource,
      action,
      context,
      ctx.prisma
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to ${action} ${resource}`,
      });
    }

    return opts.next({ ctx });
  });
}

/**
 * Create a procedure that requires an area-scoped permission
 * @param resource - The resource type (e.g., "movement", "area")
 * @param action - The action (e.g., "create", "read", "update", "delete")
 * @param getAreaId - Function to extract areaId from input
 * @param getContext - Optional function to extract context for ABAC
 */
export function createAreaPermissionProcedure(
  resource: string,
  action: string,
  getAreaId: (input: any) => string,
  getContext?: (input: any) => Record<string, any>
) {
  return protectedProcedure.use(async (opts) => {
    const { ctx, input } = opts;

    // Extract area ID from input
    const areaId = getAreaId(input);

    if (!areaId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Area ID is required for this operation',
      });
    }

    // Prepare context for ABAC evaluation
    const context = getContext ? getContext(input) : undefined;

    // Check area-scoped permission
    const hasPermission = await checkAreaPermission(
      ctx.user.id,
      areaId,
      resource,
      action,
      context,
      ctx.prisma
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `You do not have permission to ${action} ${resource} in this area`,
      });
    }

    return opts.next({ ctx });
  });
}
