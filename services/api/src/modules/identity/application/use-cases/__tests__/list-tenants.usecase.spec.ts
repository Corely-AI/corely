import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError } from "@corely/domain";
import { ListTenantsUseCase } from "../list-tenants.usecase";
import { FakeTenantRepository } from "../../../testkit/fakes/fake-tenant-repo";
import { FakeRolePermissionGrantRepository } from "../../../testkit/fakes/fake-role-permission-grant-repo";
import { PLATFORM_PERMISSION_KEYS } from "../../policies/platform-permissions.policy";
import { Tenant } from "../../../domain/entities/tenant.entity";

const buildContext = (userId?: string, roles: string[] = []) => ({
  userId,
  tenantId: null,
  roles,
  requestId: "req-1",
  correlationId: "corr-1",
});

describe("ListTenantsUseCase", () => {
  let useCase: ListTenantsUseCase;
  let tenantRepo: FakeTenantRepository;
  let grantRepo: FakeRolePermissionGrantRepository;

  beforeEach(() => {
    tenantRepo = new FakeTenantRepository();
    grantRepo = new FakeRolePermissionGrantRepository();
    useCase = new ListTenantsUseCase(tenantRepo, grantRepo);
  });

  it("lists tenants with paging, filter, and sort", async () => {
    grantRepo.grants.push({
      tenantId: null,
      roleId: "role-1",
      key: PLATFORM_PERMISSION_KEYS.tenants.read,
      effect: "ALLOW",
    });

    await tenantRepo.create(
      Tenant.create("tenant-a", "Acme", "acme", "ACTIVE", new Date("2024-01-01T00:00:00.000Z"))
    );
    await tenantRepo.create(
      Tenant.create(
        "tenant-b",
        "Bravo Corp",
        "bravo",
        "SUSPENDED",
        new Date("2024-01-02T00:00:00.000Z")
      )
    );
    await tenantRepo.create(
      Tenant.create("tenant-c", "Apex", "apex", "ACTIVE", new Date("2024-01-03T00:00:00.000Z"))
    );

    const result = await useCase.execute(
      {
        actorUserId: "user-1",
        q: "a",
        status: "ACTIVE",
        page: 1,
        pageSize: 1,
        sort: "name:asc",
      },
      buildContext("user-1", ["role-1"])
    );

    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0]?.name).toBe("Acme");
    expect(result.pageInfo).toEqual({
      page: 1,
      pageSize: 1,
      total: 2,
      hasNextPage: true,
    });
  });

  it("rejects users without platform permission", async () => {
    await expect(
      useCase.execute({ actorUserId: "user-1", page: 1, pageSize: 20 }, buildContext("user-1"))
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
