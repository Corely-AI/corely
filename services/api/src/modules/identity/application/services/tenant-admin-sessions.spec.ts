import type { KvEntry, KvGetInput, KvSetInput } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { describe, expect, it, vi } from "vitest";
import { Membership } from "../../domain/entities/membership.entity";
import { Tenant } from "../../domain/entities/tenant.entity";
import { User } from "../../domain/entities/user.entity";
import { Email } from "../../domain/value-objects/email.vo";
import { TenantAdminSessions } from "./tenant-admin-sessions";

function fixture() {
  const records = new Map<string, KvEntry>();
  const host = User.create("host", Email.create("host@example.test"), "unused");
  const tenant = Tenant.create("tenant", "Demo tenant", "demo-tenant", "ACTIVE", new Date());
  const membership = Membership.create("host-membership", null, host.getId(), "host-role");
  const tenantRole = {
    id: "tenant-admin-role",
    tenantId: tenant.getId(),
    name: "Admin",
    description: null,
    isSystem: true,
    systemKey: "ADMIN",
  };
  const audit = vi.fn().mockResolvedValue(undefined);
  const grants = vi.fn().mockResolvedValue([{ key: "platform.tenants.access", effect: "ALLOW" }]);
  const findTenant = vi.fn().mockResolvedValue(tenant);
  const sessions = new TenantAdminSessions(
    {
      get: async (key: KvGetInput) => records.get(JSON.stringify(key)) ?? null,
      set: async ({ value, ...key }: KvSetInput) => {
        const now = new Date();
        const record = { ...key, value, id: key.key, createdAt: now, updatedAt: now };
        records.set(JSON.stringify(key), record);
        return record;
      },
    },
    { acquire: async () => undefined },
    { withinTransaction: (fn) => fn({} as TransactionContext) },
    { write: audit },
    { findById: findTenant },
    { findById: async () => host },
    { findBySystemKey: async () => tenantRole },
    { findByTenantAndUser: async () => membership },
    {
      listByRoleIds: grants,
      listByRoleIdsAndTenant: async () => [],
      replaceAll: async () => undefined,
    }
  );
  return { sessions, audit, grants, findTenant };
}

describe("tenant admin sessions", () => {
  it("uses the same actor in the target tenant and audits the explicit end once on retry", async () => {
    const { sessions, audit } = fixture();
    const { accessToken } = await sessions.start("host", "tenant");
    await expect(sessions.authenticate(accessToken)).resolves.toMatchObject({
      userId: "host",
      tenantId: "tenant",
      roleIds: ["tenant-admin-role"],
    });
    await sessions.end(accessToken);
    await sessions.end(accessToken);
    await expect(sessions.authenticate(accessToken)).rejects.toMatchObject({ status: 401 });
    expect(audit.mock.calls.map(([row]) => [row.action, row.actorUserId, row.tenantId])).toEqual([
      ["identity.tenant_admin_session.started", "host", "tenant"],
      ["identity.tenant_admin_session.ended", "host", "tenant"],
    ]);
  });

  it("requires a dedicated host grant before opening access", async () => {
    const { sessions, grants, audit } = fixture();
    grants.mockResolvedValueOnce([{ key: "platform.tenants.write", effect: "ALLOW" }]);
    await expect(sessions.start("host", "tenant")).rejects.toMatchObject({ status: 403 });
    expect(audit).not.toHaveBeenCalled();
  });

  it("rejects a different tenant, revoked host grants, and an inactive or deleted tenant", async () => {
    const { sessions, grants, findTenant } = fixture();
    const { accessToken } = await sessions.start("host", "tenant");
    const changedTenantToken = accessToken.replace(".dGVuYW50.", ".b3RoZXI.");
    await expect(sessions.authenticate(changedTenantToken)).rejects.toMatchObject({ status: 401 });
    grants.mockResolvedValueOnce([]);
    await expect(sessions.authenticate(accessToken)).rejects.toMatchObject({ status: 403 });
    findTenant.mockResolvedValueOnce(null);
    await expect(sessions.authenticate(accessToken)).rejects.toMatchObject({ status: 403 });
  });
});
