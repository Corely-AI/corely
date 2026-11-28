import { z } from "zod";
import { AppCatalogItemSchema } from "@corely/contracts";
import { describe, expect, it } from "vitest";
import { createMultiOriginFixture } from "../testkit/multi-origin-fixture";
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("multi-origin fixture owners", () => {
  it("composes an Invoice-only launch from persisted membership and grants", async () => {
    const fixture = await createMultiOriginFixture();
    try {
      const result = await fixture.launches.execute({
        tenantId: fixture.first.tenantId,
        userId: fixture.first.userId,
        workspaceId: fixture.workspaceIds[0],
        permissions: ["sales.invoices.read"],
        scope: "web",
        surfaceId: "platform",
        surfaceResolutionSource: "default",
        surfaceHeaderMismatch: false,
        route: "/menu/launches",
      });
      z.array(AppCatalogItemSchema).parse(result);
      expect(result.map((app) => app.launch?.launchId)).toEqual(["invoice"]);
      expect(result[0]?.launch?.availability).toBe("available");
      const workspaces = await fixture.listWorkspaces.execute({
        tenantId: fixture.first.tenantId,
        userId: fixture.first.userId,
      });
      expect(workspaces.workspaces).toHaveLength(2);
    } finally {
      await fixture.cleanup();
    }
  });
});
