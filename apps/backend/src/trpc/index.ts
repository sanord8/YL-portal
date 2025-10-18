import { router } from './trpc';
import { movementRouter } from './routers/movement.router';
import { dashboardRouter } from './routers/dashboard.router';
import { areaRouter } from './routers/area.router';
import { departmentRouter } from './routers/department.router';

/**
 * Main tRPC App Router
 * Combines all sub-routers into a single type-safe API
 */
export const appRouter = router({
  movement: movementRouter,
  dashboard: dashboardRouter,
  area: areaRouter,
  department: departmentRouter,
  // Future routers:
  // user: userRouter,
  // report: reportRouter,
});

/**
 * Export AppRouter type for frontend inference
 */
export type AppRouter = typeof appRouter;
