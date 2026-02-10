import type { UseCaseContext } from "@corely/kernel";
import { ForbiddenError } from "@corely/domain";
import type { RolePermissionGrantRepositoryPort } from "../ports/role-permission-grant-repository.port";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "../../../../shared/permissions/effective-permissions";

export const PLATFORM_PERMISSION_KEYS = {
  tenants: {
    read: "platform.tenants.read",
    write: "platform.tenants.write",
  },
  roles: {
    read: "platform.roles.read",
    write: "platform.roles.write",
  },
  settings: {
    read: "platform.settings.read",
    write: "platform.settings.write",
  },
} as const;

export const PLATFORM_HOST_PERMISSION_KEYS = new Set<string>([
  PLATFORM_PERMISSION_KEYS.tenants.read,
  PLATFORM_PERMISSION_KEYS.tenants.write,
  PLATFORM_PERMISSION_KEYS.roles.read,
  PLATFORM_PERMISSION_KEYS.roles.write,
  PLATFORM_PERMISSION_KEYS.settings.read,
  PLATFORM_PERMISSION_KEYS.settings.write,
  "platform.apps.manage",
  "platform.templates.apply",
  "platform.packs.install",
  "platform.tenants.entitlements.write",
  "platform.tenants.features.write",
]);

export const isPlatformHostPermissionKey = (key: string): boolean =>
  PLATFORM_HOST_PERMISSION_KEYS.has(key);

export const isHostScope = (ctx: { tenantId?: string | null }): boolean => ctx.tenantId === null;

export const hasPlatformPermission = async (
  ctx: UseCaseContext,
  permission: string,
  deps: { grantRepo: RolePermissionGrantRepositoryPort }
): Promise<boolean> => {
  if (!ctx.userId) {
    return false;
  }

  if (!isHostScope(ctx)) {
    return false;
  }

  const roleIds = ctx.roles ?? [];
  if (roleIds.length === 0) {
    return false;
  }

  const grants = await deps.grantRepo.listByRoleIds(roleIds);
  const effective = computeEffectivePermissionSet(grants);

  return hasPermission(effective, permission);
};

export const canReadTenants = (
  ctx: UseCaseContext,
  deps: { grantRepo: RolePermissionGrantRepositoryPort }
) => hasPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.read, deps);

export const canManageTenants = (
  ctx: UseCaseContext,
  deps: { grantRepo: RolePermissionGrantRepositoryPort }
) => hasPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.write, deps);

export const assertPlatformPermission = async (
  ctx: UseCaseContext,
  permission: string,
  deps: { grantRepo: RolePermissionGrantRepositoryPort }
) => {
  const ok = await hasPlatformPermission(ctx, permission, deps);
  if (!ok) {
    throw new ForbiddenError("Platform permission required");
  }
};
