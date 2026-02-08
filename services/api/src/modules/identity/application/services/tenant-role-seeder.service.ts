import { Inject, Injectable } from "@nestjs/common";
import { type RoleRepositoryPort, ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import {
  type RolePermissionGrantRepositoryPort,
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
} from "../ports/role-permission-grant-repository.port";
import {
  type PermissionCatalogPort,
  PERMISSION_CATALOG_PORT,
} from "../ports/permission-catalog.port";
import {
  type IdGeneratorPort,
  ID_GENERATOR_TOKEN,
} from "../../../../shared/ports/id-generator.port";
import { buildDefaultRoleGrants, type DefaultRoleKey } from "../../permissions/default-role-grants";

@Injectable()
export class TenantRoleSeederService {
  constructor(
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {}

  async seed(tenantId: string, actorUserId: string): Promise<Record<DefaultRoleKey, string>> {
    const roles = [
      { key: "OWNER" as const, name: "Owner" },
      { key: "ADMIN" as const, name: "Admin" },
      { key: "ACCOUNTANT" as const, name: "Accountant" },
      { key: "STAFF" as const, name: "Staff" },
      { key: "READ_ONLY" as const, name: "Read-only" },
      { key: "GUARDIAN" as const, name: "Guardian" },
      { key: "STUDENT" as const, name: "Student" },
    ];

    const roleIds: Record<DefaultRoleKey, string> = {
      OWNER: "",
      ADMIN: "",
      ACCOUNTANT: "",
      STAFF: "",
      READ_ONLY: "",
      GUARDIAN: "",
      STUDENT: "",
    };

    // 1. Ensure roles exist
    for (const role of roles) {
      const existing = await this.roleRepo.findBySystemKey(tenantId, role.key);
      if (existing) {
        roleIds[role.key] = existing.id;
        continue;
      }
      const id = this.idGenerator.newId();
      await this.roleRepo.create({
        id,
        tenantId,
        name: role.name,
        systemKey: role.key,
        isSystem: true,
      });
      roleIds[role.key] = id;
    }

    // 2. Build and seed grants
    const catalog = this.catalogPort.getCatalog();
    const grants = buildDefaultRoleGrants(catalog);

    for (const key of Object.keys(roleIds) as DefaultRoleKey[]) {
      await this.grantRepo.replaceAll(tenantId, roleIds[key], grants[key], actorUserId);
    }

    return roleIds;
  }
}
