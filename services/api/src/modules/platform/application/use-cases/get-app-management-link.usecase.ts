import { Injectable } from "@nestjs/common";
import type { AppManagementLink } from "@corely/contracts";
import { GetEffectivePermissionsUseCase } from "../../../identity/public";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "../../../../shared/permissions/effective-permissions";

/** Discovery only. Mutations still require the existing host-scoped RBAC guards. */
@Injectable()
export class GetAppManagementLinkUseCase {
  constructor(private readonly permissions: GetEffectivePermissionsUseCase) {}

  async execute(tenantId: string, userId: string): Promise<AppManagementLink> {
    // Workspace membership and tenant roles never confer host administration.
    const { permissions } = await this.permissions.execute({ userId, tenantId: null });
    const effective = computeEffectivePermissionSet([
      ...permissions.allowed.map((key) => ({ key, effect: "ALLOW" as const })),
      ...permissions.denied.map((key) => ({ key, effect: "DENY" as const })),
      ...(permissions.allowAll ? [{ key: "*", effect: "ALLOW" as const }] : []),
    ]);
    const authorized = [
      "platform.tenants.read",
      "platform.tenants.write",
      "platform.apps.manage",
      "platform.tenants.entitlements.write",
    ].every((key) => hasPermission(effective, key));
    return authorized ? { path: `/settings/tenants/${encodeURIComponent(tenantId)}` } : {};
  }
}
