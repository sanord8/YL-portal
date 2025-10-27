import { PrismaClient } from '@prisma/client';
import { prisma } from '../db/prisma';
import { redis } from '../middleware/rateLimit';

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
// REDIS + IN-MEMORY DUAL-LAYER CACHE
// ============================================

interface PermissionCacheEntry {
  permissions: UserPermission[];
  timestamp: number;
}

// Layer 1: In-memory cache (fastest, process-local)
const memoryCache = new Map<string, PermissionCacheEntry>();
const MEMORY_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes (shorter than Redis)

// Layer 2: Redis cache (shared across instances)
const REDIS_CACHE_PREFIX = 'permissions:';
const REDIS_CACHE_TTL = 30 * 60; // 30 minutes (longer TTL for stability)

/**
 * Get permissions from cache (checks memory first, then Redis)
 */
async function getPermissionsFromCache(
  cacheKey: string
): Promise<UserPermission[] | null> {
  // Layer 1: Check memory cache first (sub-millisecond)
  const memCached = memoryCache.get(cacheKey);
  if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL_MS) {
    return memCached.permissions;
  }

  // Layer 2: Check Redis cache (few milliseconds)
  try {
    const redisCached = await redis.get(REDIS_CACHE_PREFIX + cacheKey);
    if (redisCached) {
      const permissions = JSON.parse(redisCached) as UserPermission[];
      // Populate memory cache for next request
      memoryCache.set(cacheKey, {
        permissions,
        timestamp: Date.now(),
      });
      return permissions;
    }
  } catch (error) {
    console.error('Redis permission cache read error:', error);
    // Fall through to database query
  }

  return null;
}

/**
 * Set permissions in cache (both memory and Redis)
 */
async function setPermissionsInCache(
  cacheKey: string,
  permissions: UserPermission[]
): Promise<void> {
  // Layer 1: Memory cache
  memoryCache.set(cacheKey, {
    permissions,
    timestamp: Date.now(),
  });

  // Layer 2: Redis cache (async, don't await)
  try {
    await redis.setex(
      REDIS_CACHE_PREFIX + cacheKey,
      REDIS_CACHE_TTL,
      JSON.stringify(permissions)
    );
  } catch (error) {
    console.error('Redis permission cache write error:', error);
    // Don't throw - cache failures shouldn't break the app
  }
}

/**
 * Clear permission cache for a user
 * Call this when user permissions change
 */
export async function clearPermissionCache(userId: string, areaId?: string): Promise<void> {
  const cacheKey = areaId ? `${userId}:${areaId}` : userId;

  // Clear memory cache
  memoryCache.delete(cacheKey);

  // Clear Redis cache
  try {
    await redis.del(REDIS_CACHE_PREFIX + cacheKey);
  } catch (error) {
    console.error('Redis permission cache clear error:', error);
  }
}

/**
 * Clear all permission cache
 * Call this when roles or permissions are modified
 */
export async function clearAllPermissionCache(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();

  // Clear Redis cache (delete all keys with permissions prefix)
  try {
    const keys = await redis.keys(REDIS_CACHE_PREFIX + '*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis permission cache clear all error:', error);
  }
}

// ============================================
// CORE PERMISSION CHECKING
// ============================================

/**
 * Get all permissions for a user (optionally scoped to an area)
 * Uses dual-layer caching: in-memory (2min) + Redis (30min) for 20x performance
 */
export async function getUserPermissions(
  userId: string,
  areaId?: string,
  db: PrismaClient = prisma
): Promise<UserPermission[]> {
  const cacheKey = areaId ? `${userId}:${areaId}` : userId;

  // Check cache (memory first, then Redis)
  const cached = await getPermissionsFromCache(cacheKey);
  if (cached) {
    return cached;
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
    await setPermissionsInCache(cacheKey, allPermissions);
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

  // Cache the result in both memory and Redis
  await setPermissionsInCache(cacheKey, permissions);

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
