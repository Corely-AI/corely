import { Inject, Injectable } from "@nestjs/common";
import type { PermissionCatalogResponse } from "@corely/contracts";
import type { PermissionCatalogPort } from "../ports/permission-catalog.port";
import { PERMISSION_CATALOG_PORT } from "../ports/permission-catalog.port";
import { PLATFORM_HOST_PERMISSION_KEYS } from "../policies/platform-permissions.policy";

export interface GetPermissionCatalogQuery {
  tenantId: string;
  actorUserId: string;
}

@Injectable()
export class GetPermissionCatalogUseCase {
  constructor(
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort
  ) {}

  async execute(query: GetPermissionCatalogQuery): Promise<PermissionCatalogResponse> {
    const catalog = this.catalogPort.getCatalog();
    if (query.tenantId !== null) {
      return {
        catalog: catalog
          .map((group) => ({
            ...group,
            permissions: group.permissions.filter(
              (permission) => !PLATFORM_HOST_PERMISSION_KEYS.has(permission.key)
            ),
          }))
          .filter((group) => group.permissions.length > 0),
      };
    }
    return { catalog };
  }
}
