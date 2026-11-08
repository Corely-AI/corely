import { describe, expect, it, vi } from "vitest";
import {
  GetMenuQuerySchema,
  GetWorkspaceConfigQuerySchema,
  type AppManifest,
} from "@corely/contracts";
import { MenuBuilderService } from "../application/services/menu-builder.service";
import type { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { TenantEntitlement } from "../domain/entitlement.aggregate";
import { invoicesAppManifest } from "../../invoices/invoices.manifest";
import { peopleAppManifest } from "../../people/people.manifest";
import type { AppRegistryPort } from "../application/ports/app-registry.port";

function fixture(enabled = ["invoices", "people", "parties", "accounting"]) {
  const other = (appId: string): AppManifest => ({
    ...invoicesAppManifest,
    appId,
    launch: undefined,
    dependencies: [],
    menu: [{ ...invoicesAppManifest.menu[0], id: appId, route: `/${appId}` }],
  });
  const manifests = [invoicesAppManifest, peopleAppManifest, other("parties"), other("accounting")];
  const registry: AppRegistryPort = {
    get: (id) => manifests.find((app) => app.appId === id),
    list: () => manifests,
    has: (id) => manifests.some((app) => app.appId === id),
    findByCapability: () => [],
  };
  const overrides = {
    findByTenantAndScope: vi.fn(async () => null),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
  const entitlement = TenantEntitlement.fromEnabledApps("tenant", enabled, registry);
  const builder = new MenuBuilderService(
    registry,
    {
      getTenantEntitlement: async () => entitlement,
    } as TenantEntitlementService,
    overrides
  );
  return { builder, overrides };
}
const base = {
  tenantId: "tenant",
  userId: "user",
  permissions: new Set(["sales.invoices.read", "people.directory.read"]),
  scope: "web" as const,
  surfaceId: "platform" as const,
};
describe("focused menu navigation", () => {
  it.each(["invoice", "hr"] as const)(
    "only contributes the %s owner while preserving legacy broad menus",
    async (launchId) => {
      const { builder } = fixture();
      expect(
        (await builder.build({ ...base, launchId })).groups.map((group) => group.appId)
      ).toEqual([launchId === "invoice" ? "invoices" : "people"]);
      expect((await builder.build(base)).groups.map((group) => group.appId).sort()).toEqual([
        "accounting",
        "invoices",
        "parties",
        "people",
      ]);
    }
  );
  it("requires permissions and an enabled owner and dependencies, without leaking dependency menus", async () => {
    for (const enabled of [["invoices"], ["parties"], []]) {
      expect(
        (await fixture(enabled).builder.build({ ...base, launchId: "invoice" })).items
      ).toEqual([]);
    }
    expect(
      (await fixture().builder.build({ ...base, launchId: "invoice", permissions: new Set() }))
        .items
    ).toEqual([]);
  });
  it("retains capability filtering for focused People navigation", async () => {
    const { builder } = fixture();
    expect(
      (
        await builder.build({
          ...base,
          launchId: "hr",
          capabilityKeys: new Set(["people.directory"]),
          capabilityFilter: new Set(),
        })
      ).items
    ).toEqual([]);
  });
  it("rejects non-web focused context and unknown wire contexts", async () => {
    await expect(
      fixture().builder.build({ ...base, launchId: "invoice", scope: "pos" })
    ).rejects.toThrow();
    for (const launchId of ["unknown", "invoices", ["invoice", "hr"]]) {
      expect(GetMenuQuerySchema.safeParse({ launchId }).success).toBe(false);
      expect(GetWorkspaceConfigQuerySchema.safeParse({ launchId }).success).toBe(false);
    }
    expect(GetMenuQuerySchema.parse({})).toEqual({ scope: "web" });
  });
});
