import { PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma';

/**
 * Permission Service
 * Handles RBAC (Role-Based Access Control) with ABAC (Attribute-Based Access Control) support
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PermissionCheck {
  resource: string; // e.g., "movement", "area", "user"
  action: string; // e.g., "create", "read", "update", "delete", "approve"
}

export interface UserPermission extends PermissionCheck {
  conditions?: Record<string, any> | null; // ABAC conditions
}

// ============================================
// IN-MEMORY CACHE
// ============================================

interface PermissionCacheEntry {
  permissions: UserPermission[];
  timestamp: number;
}

const permissionCache = new Map<string, PermissionCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clear permission cache for a user
 * Call this when user permissions change
 */
export function clearPermissionCache(userId: string, areaId?: string): void {
  const cacheKey = areaId ? `${userId}:${areaId}` : userId;
  permissionCache.delete(cacheKey);
}

/**
 * Clear all permission cache
 * Call this when roles or permissions are modified
 */
export function clearAllPermissionCache(): void {
  permissionCache.clear();
}

// ============================================
// CORE PERMISSION CHECKING
// ============================================

/**
 * Get all permissions for a user (optionally scoped to an area)
 * Results are cached for performance
 */
export async function getUserPermissions(
  userId: string,
  areaId?: string,
  db: PrismaClient = prisma
): Promise<UserPermission[]> {
  const cacheKey = areaId ? `${userId}:${areaId}` : userId;

  // Check cache
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  // Fetch user to check global admin status
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  // Global admins have all permissions
  if (user?.isAdmin) {
    const allPermissions: UserPermission[] = [
      { resource: '*', action: '*', conditions: null },
    ];
    permissionCache.set(cacheKey, {
      permissions: allPermissions,
      timestamp: Date.now(),
    });
    return allPermissions;
  }

  // Build query for user's area assignments
  const where: any = { userId };
  if (areaId) {
    where.areaId = areaId;
  }

  // Fetch user's roles and permissions
  const userAreas = await db.userArea.findMany({
    where,
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  // Aggregate all unique permissions
  const permissionMap = new Map<string, UserPermission>();

  for (const userArea of userAreas) {
    for (const rolePermission of userArea.role.permissions) {
      const key = `${rolePermission.permission.resource}:${rolePermission.permission.action}`;

      // If permission already exists, merge conditions
      const existing = permissionMap.get(key);
      if (existing) {
        // For now, we'll use the more permissive conditions (null = no restrictions)
        if (rolePermission.conditions === null) {
          existing.conditions = null;
        }
      } else {
        permissionMap.set(key, {
          resource: rolePermission.permission.resource,
          action: rolePermission.permission.action,
          conditions: rolePermission.conditions as Record<string, any> | null,
        });
      }
    }
  }

  const permissions = Array.from(permissionMap.values());

  // Cache the result
  permissionCache.set(cacheKey, {
    permissions,
    timestamp: Date.now(),
  });

  return permissions;
}

/**
 * Check if a permission matches a required permission
 * Supports wildcard matching (e.g., "movement:*" or "*:read")
 */
function permissionMatches(
  userPermission: PermissionCheck,
  requiredPermission: PermissionCheck
): boolean {
  // Exact match
  if (
    userPermission.resource === requiredPermission.resource &&
    userPermission.action === requiredPermission.action
  ) {
    return true;
  }

  // Wildcard resource (e.g., "*:read")
  if (
    userPermission.resource === '*' &&
    userPermission.action === requiredPermission.action
  ) {
    return true;
  }

  // Wildcard action (e.g., "movement:*")
  if (
    userPermission.resource === requiredPermission.resource &&
    userPermission.action === '*'
  ) {
    return true;
  }

  // Super wildcard (e.g., "*:*")
  if (userPermission.resource === '*' && userPermission.action === '*') {
    return true;
  }

  return false;
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  context?: Record<string, any>,
  db: PrismaClient = prisma
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, undefined, db);

  const requiredPermission: PermissionCheck = { resource, action };

  for (const permission of permissions) {
    if (permissionMatches(permission, requiredPermission)) {
      // Check ABAC conditions if present
      if (permission.conditions && context) {
        const conditionsMet = evaluateConditions(permission.conditions, context);
        if (!conditionsMet) {
          continue; // This permission has conditions that aren't met
        }
      }
      return true;
    }
  }

  return false;
}

/**
 * Check if user has a specific permission scoped to an area
 */
export async function checkAreaPermission(
  userId: string,
  areaId: string,
  resource: string,
  action: string,
  context?: Record<string, any>,
  db: PrismaClient = prisma
): Promise<boolean> {
  // First check if user is global admin (has all permissions)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (user?.isAdmin) {
    return true;
  }

  // Get area-scoped permissions
  const permissions = await getUserPermissions(userId, areaId, db);

  const requiredPermission: PermissionCheck = { resource, action };

  for (const permission of permissions) {
    if (permissionMatches(permission, requiredPermission)) {
      // Check ABAC conditions if present
      if (permission.conditions && context) {
        const conditionsMet = evaluateConditions(permission.conditions, context);
        if (!conditionsMet) {
          continue;
        }
      }
      return true;
    }
  }

  return false;
}

/**
 * Evaluate ABAC conditions
 * Currently supports simple numeric comparisons
 */
function evaluateConditions(
  conditions: Record<string, any>,
  context: Record<string, any>
): boolean {
  for (const [key, conditionValue] of Object.entries(conditions)) {
    const contextValue = context[key];

    // Handle numeric comparisons
    if (typeof conditionValue === 'number' && typeof contextValue === 'number') {
      // For amounts, condition is typically a maximum
      if (key.includes('max') || key.includes('Max') || key.includes('limit') || key.includes('Limit')) {
        if (contextValue > conditionValue) {
          return false;
        }
      }
      // For minimums
      else if (key.includes('min') || key.includes('Min')) {
        if (contextValue < conditionValue) {
          return false;
        }
      }
      // Default: exact match
      else {
        if (contextValue !== conditionValue) {
          return false;
        }
      }
    }
    // Handle array membership (e.g., departmentIds)
    else if (Array.isArray(conditionValue)) {
      if (!conditionValue.includes(contextValue)) {
        return false;
      }
    }
    // Handle exact match for other types
    else {
      if (contextValue !== conditionValue) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Assert that user has permission, throw error if not
 * Useful for imperative permission checking
 */
export async function assertPermission(
  userId: string,
  resource: string,
  action: string,
  errorMessage?: string,
  context?: Record<string, any>,
  db: PrismaClient = prisma
): Promise<void> {
  const hasPermission = await checkPermission(userId, resource, action, context, db);

  if (!hasPermission) {
    throw new Error(
      errorMessage ||
        `Permission denied: User does not have permission to ${action} ${resource}`
    );
  }
}

/**
 * Assert that user has area permission, throw error if not
 */
export async function assertAreaPermission(
  userId: string,
  areaId: string,
  resource: string,
  action: string,
  errorMessage?: string,
  context?: Record<string, any>,
  db: PrismaClient = prisma
): Promise<void> {
  const hasPermission = await checkAreaPermission(
    userId,
    areaId,
    resource,
    action,
    context,
    db
  );

  if (!hasPermission) {
    throw new Error(
      errorMessage ||
        `Permission denied: User does not have permission to ${action} ${resource} in this area`
    );
  }
}
