import { z } from 'zod';

// Movement validation schemas
export const movementTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'DISTRIBUTION']);
export const movementStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const createMovementSchema = z.object({
  areaId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  type: movementTypeSchema,
  amount: z.number().int().positive().describe('Amount in cents'),
  currency: z.string().length(3).default('EUR'),
  description: z.string().min(1).max(500),
  category: z.string().max(100).optional(),
  reference: z.string().max(100).optional(),
  transactionDate: z.coerce.date(),
});

export const updateMovementSchema = createMovementSchema.partial();

export const movementFilterSchema = z.object({
  areaId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  type: movementTypeSchema.optional(),
  status: movementStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.number().int().optional(),
  maxAmount: z.number().int().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// User validation schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  twoFactorCode: z.string().length(6).optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Area validation schemas
export const createAreaSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default('EUR'),
});

export const updateAreaSchema = createAreaSchema.partial();

// Export type inference helpers
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type UpdateMovementInput = z.infer<typeof updateMovementSchema>;
export type MovementFilterInput = z.infer<typeof movementFilterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
