import type { PermissionGroup, RolePermissionEffect } from "@corely/contracts";
import { PLATFORM_HOST_PERMISSION_KEYS } from "../application/policies/platform-permissions.policy";

export type DefaultRoleKey =
  | "OWNER"
  | "ADMIN"
  | "ACCOUNTANT"
  | "STAFF"
  | "READ_ONLY"
  | "GUARDIAN"
  | "STUDENT";

export const buildDefaultRoleGrants = (
  catalog: PermissionGroup[]
): Record<DefaultRoleKey, Array<{ key: string; effect: RolePermissionEffect }>> => {
  const allKeys = catalog.flatMap((group) => group.permissions.map((permission) => permission.key));

  const uniqueKeys = Array.from(new Set(allKeys));
  const tenantAssignableKeys = uniqueKeys.filter((key) => !PLATFORM_HOST_PERMISSION_KEYS.has(key));
  const readKeys = tenantAssignableKeys.filter((key) => key.endsWith(".read"));

  const accountantKeys = tenantAssignableKeys.filter(
    (key) =>
      key.startsWith("sales.invoices.") ||
      key.startsWith("sales.payments.") ||
      key.startsWith("expenses.") ||
      key.startsWith("accounting.") ||
      key.startsWith("purchasing.")
  );

  const staffKeys = tenantAssignableKeys.filter(
    (key) => key.endsWith(".read") && !key.startsWith("settings.")
  );

  const readOnlyKeys = readKeys.filter((key) => !key.startsWith("settings."));

  return {
    OWNER: tenantAssignableKeys.map((key) => ({ key, effect: "ALLOW" })),
    ADMIN: tenantAssignableKeys.map((key) => ({ key, effect: "ALLOW" })),
    ACCOUNTANT: accountantKeys.map((key) => ({ key, effect: "ALLOW" })),
    STAFF: staffKeys.map((key) => ({ key, effect: "ALLOW" })),
    READ_ONLY: readOnlyKeys.map((key) => ({ key, effect: "ALLOW" })),
    GUARDIAN: tenantAssignableKeys
      .filter((key) => key.startsWith("portal."))
      .map((key) => ({ key, effect: "ALLOW" })),
    STUDENT: tenantAssignableKeys
      .filter((key) => key.startsWith("portal."))
      .map((key) => ({ key, effect: "ALLOW" })),
  };
};
