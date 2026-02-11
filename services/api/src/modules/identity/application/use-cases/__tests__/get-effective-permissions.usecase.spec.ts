import { beforeEach, describe, expect, it } from "vitest";
import { GetEffectivePermissionsUseCase } from "../get-effective-permissions.usecase";
import { FakeRolePermissionGrantRepository } from "../../../testkit/fakes/fake-role-permission-grant-repo";
import { FakeRoleRepository } from "../../../testkit/fakes/fake-role-repo";

describe("GetEffectivePermissionsUseCase", () => {
  let grantRepo: FakeRolePermissionGrantRepository;
  let roleRepo: FakeRoleRepository;
  let useCase: GetEffectivePermissionsUseCase;

  beforeEach(async () => {
    grantRepo = new FakeRolePermissionGrantRepository();
    roleRepo = new FakeRoleRepository();
    useCase = new GetEffectivePermissionsUseCase(grantRepo, roleRepo);
  });

  it("returns allowAll for tenant owner role", async () => {
    await roleRepo.create({
      id: "role-owner",
      tenantId: "tenant-1",
      name: "Owner",
      isSystem: true,
      systemKey: "OWNER",
    });

    const result = await useCase.execute({
      userId: "user-1",
      tenantId: "tenant-1",
      roles: ["role-owner"],
    });

    expect(result.permissions.allowAll).toBe(true);
    expect(result.permissions.denied).toEqual([]);
  });

  it("resolves grants for non-owner tenant role", async () => {
    await roleRepo.create({
      id: "role-admin",
      tenantId: "tenant-1",
      name: "Admin",
      isSystem: true,
      systemKey: "ADMIN",
    });
    grantRepo.grants.push({
      tenantId: "tenant-1",
      roleId: "role-admin",
      key: "tenant.apps.read",
      effect: "ALLOW",
    });

    const result = await useCase.execute({
      userId: "user-1",
      tenantId: "tenant-1",
      roles: ["role-admin"],
    });

    expect(result.permissions.allowAll).toBe(false);
    expect(result.permissions.allowed).toContain("tenant.apps.read");
  });
});
