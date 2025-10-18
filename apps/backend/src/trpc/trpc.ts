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
