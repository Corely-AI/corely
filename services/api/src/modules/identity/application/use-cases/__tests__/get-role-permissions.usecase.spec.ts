import { beforeEach, describe, expect, it } from "vitest";
import { GetRolePermissionsUseCase } from "../get-role-permissions.usecase";
import { FakeRoleRepository } from "../../../testkit/fakes/fake-role-repo";
import { FakeRolePermissionGrantRepository } from "../../../testkit/fakes/fake-role-permission-grant-repo";
import type { PermissionCatalogPort } from "../../ports/permission-catalog.port";

describe("GetRolePermissionsUseCase", () => {
  let roleRepo: FakeRoleRepository;
  let grantRepo: FakeRolePermissionGrantRepository;
  let catalogPort: PermissionCatalogPort;
  let useCase: GetRolePermissionsUseCase;

  beforeEach(async () => {
    roleRepo = new FakeRoleRepository();
    grantRepo = new FakeRolePermissionGrantRepository();
    catalogPort = {
      getCatalog: () => [
        {
          id: "platform",
          label: "Platform",
          permissions: [
            {
              key: "platform.apps.manage",
              group: "platform",
              label: "Manage Apps",
            },
          ],
        },
        {
          id: "tenant",
          label: "Tenant Management",
          permissions: [
            {
              key: "tenant.apps.read",
              group: "tenant",
              label: "View Apps",
            },
            {
              key: "tenant.apps.manage",
              group: "tenant",
              label: "Manage Apps",
            },
          ],
        },
      ],
    };

    useCase = new GetRolePermissionsUseCase(roleRepo, catalogPort, grantRepo);
  });

  it("marks all tenant permissions granted for owner role", async () => {
    await roleRepo.create({
      id: "role-owner",
      tenantId: "tenant-1",
      name: "Owner",
      isSystem: true,
      systemKey: "OWNER",
    });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      actorUserId: "user-1",
      roleId: "role-owner",
    });

    expect(result.catalog.some((group) => group.id === "platform")).toBe(false);
    expect(result.catalog.some((group) => group.id === "tenant")).toBe(true);
    const tenantManage = result.grants.find((grant) => grant.key === "tenant.apps.manage");
    expect(tenantManage?.granted).toBe(true);
    expect(tenantManage?.effect).toBe("ALLOW");
  });
});
