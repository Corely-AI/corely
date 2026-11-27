import type { EffectivePermissionsResponse } from "@corely/contracts";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "../../../shared/permissions/effective-permissions";

export const expensePermissions = (permissions: EffectivePermissionsResponse["permissions"]) => {
  const grants = [
    ...permissions.allowed.map((key) => ({ key, effect: "ALLOW" as const })),
    ...permissions.denied.map((key) => ({ key, effect: "DENY" as const })),
    ...(permissions.allowAll ? [{ key: "*", effect: "ALLOW" as const }] : []),
  ];
  const effective = computeEffectivePermissionSet(grants);
  return {
    read: hasPermission(effective, "expenses.read"),
    write: hasPermission(effective, "expenses.write"),
  };
};
