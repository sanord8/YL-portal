import { router } from './trpc';
import { movementRouter } from './routers/movement.router';
import { dashboardRouter } from './routers/dashboard.router';
import { areaRouter } from './routers/area.router';
import { bankAccountRouter } from './routers/bankAccount.router';
import { departmentRouter } from './routers/department.router';
import { userRouter } from './routers/user.router';
import { adminRouter } from './routers/admin.router';
import { importRouter } from './routers/import.router';
import { draftRouter } from './routers/draft.router';
import { attachmentRouter } from './routers/attachment.router';
import { reportRouter } from './routers/report.router';

/**
 * Main tRPC App Router
 * Combines all sub-routers into a single type-safe API
 */
export const appRouter = router({
  movement: movementRouter,
  dashboard: dashboardRouter,
  area: areaRouter,
  bankAccount: bankAccountRouter,
  department: departmentRouter,
  user: userRouter,
  admin: adminRouter,
  import: importRouter,
  draft: draftRouter,
  attachment: attachmentRouter,
  report: reportRouter,
});

/**
 * Export AppRouter type for frontend inference
 */
export type AppRouter = typeof appRouter;
