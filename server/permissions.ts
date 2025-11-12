import { Request, Response, NextFunction } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { userMemberships, roles, rolePermissions, permissions, tiers } from '../shared/schema';
import { db } from './db';

// Cache for user permissions (simple in-memory cache)
const permissionCache = new Map<string, Set<string>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  permissions: Set<string>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  // Check cache
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  // Query database
  const result = await db
    .select({
      permissionKey: permissions.key,
    })
    .from(userMemberships)
    .innerJoin(roles, eq(userMemberships.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(
      eq(userMemberships.userId, userId),
      eq(userMemberships.isActive, true)
    ));

  const perms = new Set(result.map(r => r.permissionKey));

  // Update cache
  cache.set(userId, {
    permissions: perms,
    timestamp: Date.now(),
  });

  return perms;
}

/**
 * Check if user has a specific permission
 * Supports wildcard permissions: '*' for all, 'event.*' for all event permissions
 */
export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  
  // Check for admin wildcard
  if (permissions.has('*')) return true;
  
  // Check for exact permission
  if (permissions.has(permissionKey)) return true;
  
  // Check for wildcard permissions (e.g., "event.*" covers "event.create")
  const parts = permissionKey.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcard = parts.slice(0, i).join('.') + '.*';
    if (permissions.has(wildcard)) return true;
  }
  
  return false;
}

/**
 * Check if user has any of the specified permissions
 * Supports wildcard permissions
 */
export async function hasAnyPermission(userId: string, permissionKeys: string[]): Promise<boolean> {
  for (const key of permissionKeys) {
    if (await hasPermission(userId, key)) return true;
  }
  return false;
}

/**
 * Check if user has all of the specified permissions
 * Supports wildcard permissions
 */
export async function hasAllPermissions(userId: string, permissionKeys: string[]): Promise<boolean> {
  for (const key of permissionKeys) {
    if (!(await hasPermission(userId, key))) return false;
  }
  return true;
}

/**
 * Clear permission cache for a user (call when user's membership changes)
 */
export function clearUserPermissionCache(userId: string): void {
  cache.delete(userId);
}

/**
 * Clear all permission cache
 */
export function clearAllPermissionCache(): void {
  cache.clear();
}

/**
 * Express middleware to require a specific permission
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const allowed = await hasPermission(req.user.id, permissionKey);
    if (!allowed) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: permissionKey
      });
    }

    next();
  };
}

/**
 * Express middleware to require any of the specified permissions
 */
export function requireAnyPermission(...permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const allowed = await hasAnyPermission(req.user.id, permissionKeys);
    if (!allowed) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        requiredAny: permissionKeys
      });
    }

    next();
  };
}

/**
 * Express middleware to require all of the specified permissions
 */
export function requireAllPermissions(...permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const allowed = await hasAllPermissions(req.user.id, permissionKeys);
    if (!allowed) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        requiredAll: permissionKeys
      });
    }

    next();
  };
}

/**
 * Get user's tier and role information
 */
export async function getUserMembershipInfo(userId: string) {
  const result = await db
    .select({
      membershipId: userMemberships.id,
      tierCode: tiers.code,
      tierName: tiers.name,
      roleCode: roles.code,
      roleName: roles.name,
      isActive: userMemberships.isActive,
      startedAt: userMemberships.startedAt,
      expiresAt: userMemberships.expiresAt,
    })
    .from(userMemberships)
    .innerJoin(tiers, eq(userMemberships.tierId, tiers.id))
    .innerJoin(roles, eq(userMemberships.roleId, roles.id))
    .where(and(
      eq(userMemberships.userId, userId),
      eq(userMemberships.isActive, true)
    ))
    .limit(1);

  return result[0] || null;
}
