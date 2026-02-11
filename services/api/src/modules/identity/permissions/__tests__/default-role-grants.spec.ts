import { describe, expect, it } from "vitest";
import type { PermissionGroup } from "@corely/contracts";
import { buildDefaultRoleGrants } from "../default-role-grants";

describe("buildDefaultRoleGrants", () => {
  it("excludes host-only platform permissions from tenant role seeds", () => {
    const catalog: PermissionGroup[] = [
      {
        id: "platform",
        label: "Platform",
        permissions: [
          {
            key: "platform.apps.manage",
            group: "platform",
            label: "Manage apps (host)",
          },
          {
            key: "platform.tenants.read",
            group: "platform",
            label: "Read tenants (host)",
          },
        ],
      },
      {
        id: "tenant",
        label: "Tenant",
        permissions: [
          {
            key: "tenant.apps.read",
            group: "tenant",
            label: "Read apps",
          },
          {
            key: "tenant.apps.manage",
            group: "tenant",
            label: "Manage apps",
          },
        ],
      },
    ];

    const grants = buildDefaultRoleGrants(catalog);
    const ownerKeys = new Set(grants.OWNER.map((entry) => entry.key));
    const adminKeys = new Set(grants.ADMIN.map((entry) => entry.key));

    expect(ownerKeys.has("platform.apps.manage")).toBe(false);
    expect(ownerKeys.has("platform.tenants.read")).toBe(false);
    expect(ownerKeys.has("tenant.apps.read")).toBe(true);
    expect(ownerKeys.has("tenant.apps.manage")).toBe(true);

    expect(adminKeys.has("platform.apps.manage")).toBe(false);
    expect(adminKeys.has("tenant.apps.manage")).toBe(true);
  });
});
