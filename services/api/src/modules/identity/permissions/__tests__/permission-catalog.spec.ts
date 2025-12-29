import { describe, it, expect } from "vitest";
import { validatePermissionCatalog } from "../permission-catalog";
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
});
