import { Inject, Injectable } from "@nestjs/common";
import type { RolePermissionEffect } from "@corely/contracts";
import type { AppRegistryPort } from "../../../platform/application/ports/app-registry.port";
import { APP_REGISTRY_TOKEN } from "../../../platform/application/ports/app-registry.port";
import type { PermissionCatalogPort } from "../ports/permission-catalog.port";
import { PERMISSION_CATALOG_PORT } from "../ports/permission-catalog.port";
import { UpdateRolePermissionsUseCase } from "./update-role-permissions.usecase";

export interface SyncRolePermissionsFromManifestsCommand {
  tenantId: string;
  actorUserId: string;
  roleId: string;
}

export interface SyncRolePermissionsFromManifestsResult {
  grantedCount: number;
  skippedCount: number;
}

@Injectable()
export class SyncRolePermissionsFromManifestsUseCase {
  constructor(
    @Inject(APP_REGISTRY_TOKEN) private readonly appRegistry: AppRegistryPort,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
    private readonly updateRolePermissions: UpdateRolePermissionsUseCase
  ) {}

  async execute(
    command: SyncRolePermissionsFromManifestsCommand
  ): Promise<SyncRolePermissionsFromManifestsResult> {
    const manifestKeys = new Set<string>();

    for (const manifest of this.appRegistry.list()) {
      for (const key of manifest.permissions ?? []) {
        manifestKeys.add(key);
      }
    }

    const validKeys = new Set(
      this.catalogPort
        .getCatalog()
        .flatMap((group) => group.permissions.map((permission) => permission.key))
    );

    const grants: Array<{ key: string; effect: RolePermissionEffect }> = [];
    let skippedCount = 0;

    for (const key of manifestKeys) {
      if (!validKeys.has(key)) {
        skippedCount += 1;
        continue;
      }
      grants.push({ key, effect: "ALLOW" });
    }

    await this.updateRolePermissions.execute({
      tenantId: command.tenantId,
      actorUserId: command.actorUserId,
      roleId: command.roleId,
      grants,
    });

    return {
      grantedCount: grants.length,
      skippedCount,
    };
  }
}
