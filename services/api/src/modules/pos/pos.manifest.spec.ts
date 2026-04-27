import { describe, expect, it } from "vitest";
import { posAdminAppManifest } from "./pos.manifest";

describe("posAdminAppManifest", () => {
  it("contributes a read-only transactions menu item for the POS admin surface", () => {
    expect(posAdminAppManifest.permissions).toContain("pos.transactions.read");
    expect(posAdminAppManifest.menu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "pos-admin-transactions",
          scope: "web",
          section: "pos",
          route: "/pos/admin/transactions",
          requiresPermissions: ["pos.transactions.read"],
        }),
      ])
    );
  });
});
