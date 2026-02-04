import { beforeEach, describe, expect, it } from "vitest";
import { CreateTenantUseCase } from "../create-tenant.usecase";
import { FakeTenantRepository } from "../../../testkit/fakes/fake-tenant-repo";
import { MockOutbox } from "../../../testkit/mocks/mock-outbox";
import { MockAudit } from "../../../testkit/mocks/mock-audit";
import { MockIdempotencyStoragePort } from "@shared/testkit/mocks/mock-idempotency-port";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { Tenant } from "../../../domain/entities/tenant.entity";
import { ForbiddenError, ValidationFailedError } from "@corely/domain";
import type { ExtKvPort } from "@corely/data";
import { FakeRolePermissionGrantRepository } from "../../../testkit/fakes/fake-role-permission-grant-repo";
import { PLATFORM_PERMISSION_KEYS } from "../../policies/platform-permissions.policy";
import { FakeTenantRoleSeeder } from "../../../testkit/fakes/fake-tenant-role-seeder";

const buildContext = (userId?: string, roles: string[] = []) => ({
  userId,
  tenantId: null,
  roles,
  requestId: "req-1",
  correlationId: "corr-1",
});

describe("CreateTenantUseCase", () => {
  let useCase: CreateTenantUseCase;
  let tenantRepo: FakeTenantRepository;
  let grantRepo: FakeRolePermissionGrantRepository;
  let outbox: MockOutbox;
  let audit: MockAudit;
  let idempotency: MockIdempotencyStoragePort;
  let extKv: ExtKvPort;
  let roleSeeder: FakeTenantRoleSeeder;

  beforeEach(() => {
    tenantRepo = new FakeTenantRepository();
    grantRepo = new FakeRolePermissionGrantRepository();
    outbox = new MockOutbox();
    audit = new MockAudit();
    idempotency = new MockIdempotencyStoragePort();
    roleSeeder = new FakeTenantRoleSeeder();
    extKv = {
      get: async () => null,
      set: async (input) => ({
        id: "kv-1",
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        scope: input.scope,
        key: input.key,
        value: input.value,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: async () => {},
      list: async () => [],
    };

    useCase = new CreateTenantUseCase(
      tenantRepo,
      grantRepo,
      outbox,
      audit,
      idempotency,
      new FakeIdGenerator("tenant-id"),
      new FakeClock(new Date("2024-01-01T00:00:00.000Z")),
      extKv,
      roleSeeder
    );
  });

  it("creates tenant for host user with platform permission", async () => {
    grantRepo.grants.push({
      tenantId: null,
      roleId: "role-1",
      key: PLATFORM_PERMISSION_KEYS.tenants.write,
      effect: "ALLOW",
    });

    const result = await useCase.execute(
      {
        name: "Acme",
        slug: "acme",
        status: "ACTIVE",
        notes: "Internal notes",
        idempotencyKey: "idem-1",
      },
      buildContext("user-1", ["role-1"])
    );

    expect(result.tenant.slug).toBe("acme");
    expect(tenantRepo.tenants).toHaveLength(1);
    expect(outbox.events.map((e) => e.eventType)).toContain("identity.tenant.created");
    expect(audit.entries).toHaveLength(1);
  });

  it("rejects users without platform permissions", async () => {
    await expect(
      useCase.execute({ name: "Acme", slug: "acme" }, buildContext("user-1", ["role-1"]))
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects duplicate slugs", async () => {
    grantRepo.grants.push({
      tenantId: null,
      roleId: "role-1",
      key: PLATFORM_PERMISSION_KEYS.tenants.write,
      effect: "ALLOW",
    });
    await tenantRepo.create(Tenant.create("existing", "Existing", "acme"));

    await expect(
      useCase.execute({ name: "Acme", slug: "acme" }, buildContext("user-1", ["role-1"]))
    ).rejects.toBeInstanceOf(ValidationFailedError);
  });
});
