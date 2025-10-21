import { initTRPC, TRPCError } from '@trpc/server';
import { TRPCContext } from './context';

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
