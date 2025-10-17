// Shared configuration constants

export const APP_NAME = 'YL Portal';
export const APP_VERSION = '1.0.0';

// Currency configuration
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP'] as const;
export const DEFAULT_CURRENCY = 'EUR';

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 100;

// Session
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_COOKIE_NAME = 'yl_session';

// File uploads
export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

// Movement categories
export const MOVEMENT_CATEGORIES = [
  'Salaries',
  'Rent',
  'Utilities',
  'Office Supplies',
  'Travel',
  'Marketing',
  'Training',
  'Equipment',
  'Other',
] as const;

// API endpoints
export const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
export const API_VERSION = 'v1';

// Feature flags
export const FEATURES = {
  TWO_FACTOR_AUTH: true,
  REAL_TIME_UPDATES: true,
  OFFLINE_MODE: false,
  DARK_MODE: true,
  MULTI_LANGUAGE: true,
} as const;
