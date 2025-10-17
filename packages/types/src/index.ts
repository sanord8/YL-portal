// Shared TypeScript types for YL Portal

export type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DISTRIBUTION';
export type MovementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Area {
  id: string;
  name: string;
  code: string;
  description?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Movement {
  id: string;
  areaId: string;
  departmentId?: string;
  userId: string;
  type: MovementType;
  status: MovementStatus;
  amount: number; // Amount in cents
  currency: string;
  description: string;
  category?: string;
  reference?: string;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

// Form data types
export interface CreateMovementInput {
  areaId: string;
  departmentId?: string;
  type: MovementType;
  amount: number;
  currency?: string;
  description: string;
  category?: string;
  reference?: string;
  transactionDate: Date;
}
