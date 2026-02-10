import { describe, expect, it } from "vitest";
import { hasPlatformPermission, PLATFORM_PERMISSION_KEYS } from "../platform-permissions.policy";
import { FakeRolePermissionGrantRepository } from "../../../testkit/fakes/fake-role-permission-grant-repo";

describe("platform-permissions.policy", () => {
  it("allows host scope with required platform permission", async () => {
    const grantRepo = new FakeRolePermissionGrantRepository();
    grantRepo.grants.push({
      tenantId: null,
      roleId: "role-1",
      key: PLATFORM_PERMISSION_KEYS.tenants.write,
      effect: "ALLOW",
    });

    const allowed = await hasPlatformPermission(
      {
        userId: "user-1",
        tenantId: null,
        roles: ["role-1"],
      },
      PLATFORM_PERMISSION_KEYS.tenants.write,
      { grantRepo }
    );

    expect(allowed).toBe(true);
  });

  it("denies when not in host scope", async () => {
    const grantRepo = new FakeRolePermissionGrantRepository();
    grantRepo.grants.push({
      tenantId: "tenant-1",
      roleId: "role-1",
      key: PLATFORM_PERMISSION_KEYS.tenants.write,
      effect: "ALLOW",
    });

    const allowed = await hasPlatformPermission(
      {
        userId: "user-1",
        tenantId: "tenant-1",
        roles: ["role-1"],
      },
      PLATFORM_PERMISSION_KEYS.tenants.write,
      { grantRepo }
    );

    expect(allowed).toBe(false);
  });

  it("denies when permission is missing", async () => {
    const grantRepo = new FakeRolePermissionGrantRepository();

    const allowed = await hasPlatformPermission(
      {
        userId: "user-1",
        tenantId: null,
        roles: ["role-1"],
      },
      PLATFORM_PERMISSION_KEYS.tenants.write,
      { grantRepo }
    );

    expect(allowed).toBe(false);
  });
});
