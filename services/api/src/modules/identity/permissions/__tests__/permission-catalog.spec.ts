import { describe, it, expect } from "vitest";
import { buildPermissionCatalog, validatePermissionCatalog } from "../permission-catalog";
import { ValidationError } from "../../../../shared/errors/domain-errors";

describe("Permission catalog validation", () => {
  it("rejects duplicate permission keys", () => {
    const catalog = [
      {
        id: "settings",
        label: "Settings",
        permissions: [
          { key: "settings.roles.manage", group: "settings", label: "Manage" },
          { key: "settings.roles.manage", group: "settings", label: "Manage Duplicate" },
        ],
      },
    ];

    expect(() => validatePermissionCatalog(catalog)).toThrow(ValidationError);
  });

  it("includes tenant app permissions in catalog", () => {
    const catalog = buildPermissionCatalog();
    const keys = new Set(
      catalog.flatMap((group) => group.permissions.map((permission) => permission.key))
    );
    expect(keys.has("tenant.apps.read")).toBe(true);
    expect(keys.has("tenant.apps.manage")).toBe(true);
  });
});
