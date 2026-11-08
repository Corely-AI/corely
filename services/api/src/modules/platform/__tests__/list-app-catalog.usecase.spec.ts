import { describe, expect, it, vi } from "vitest";
import { AppCatalogItemSchema, AppManifestSchema, type AppManifest } from "@corely/contracts";
import type { AppRegistryPort } from "../application/ports/app-registry.port";
import type { TenantAppInstallRepositoryPort } from "../application/ports/tenant-app-install-repository.port";
import { ListAppCatalogUseCase } from "../application/use-cases/list-app-catalog.usecase";
import { invoicesAppManifest } from "../../invoices/invoices.manifest";
import { peopleAppManifest } from "../../people/people.manifest";
import { partyAppManifest } from "../../party/party.manifest";

function fixture(apps: AppManifest[] = [invoicesAppManifest, peopleAppManifest, partyAppManifest]) {
  const registry: AppRegistryPort = {
    list: () => apps,
    get: (id) => apps.find((app) => app.appId === id),
    has: (id) => apps.some((app) => app.appId === id),
    findByCapability: () => [],
  };
  const listByTenant = vi.fn(async (tenantId: string) =>
    tenantId === "tenant-a"
      ? [
          { appId: "invoices", enabled: true, configJson: '{"launchUrl":"https://evil.test"}' },
          { appId: "people", enabled: false },
        ]
      : []
  );
  // This read use case only needs listByTenant; any writes would fail the fixture.
  const installs = { listByTenant } as unknown as TenantAppInstallRepositoryPort;
  const origins = { invoice: "https://invoice.app.corely.one", hr: "https://hr.app.corely.one" };
  return {
    useCase: new ListAppCatalogUseCase(registry, installs, origins),
    listByTenant,
    registry,
    installs,
  };
}
const released = (app: AppManifest): AppManifest => ({
  ...app,
  launch: { ...app.launch!, availability: "available" },
});

describe("existing app catalog launch projection", () => {
  it("maps display IDs to existing owners, preserves dependencies and never promotes unshipped UIs", async () => {
    const f = fixture();
    const items = await f.useCase.execute("tenant-a");
    expect(f.listByTenant).toHaveBeenCalledWith("tenant-a");
    expect(items[0]).toMatchObject({
      appId: "invoices",
      dependencies: ["parties"],
      enabled: true,
      launch: { launchId: "invoice", category: "finance", availability: "coming-soon" },
    });
    expect(items[1]).toMatchObject({
      appId: "people",
      launch: { launchId: "hr", category: "people", availability: "coming-soon" },
    });
    expect(items[2]).not.toHaveProperty("launch");
    for (const app of [invoicesAppManifest, peopleAppManifest]) {
      expect(AppManifestSchema.safeParse(app).success).toBe(true);
    }
    for (const item of items) {
      expect(AppCatalogItemSchema.safeParse(item).success).toBe(true);
      expect(item.launch?.url).toBeUndefined();
    }
  });

  it("emits only a configured root for a released, installed app and ignores tenant URLs", async () => {
    const f = fixture([
      released(invoicesAppManifest),
      released(peopleAppManifest),
      partyAppManifest,
    ]);
    const items = await f.useCase.execute("tenant-a");
    expect(items[0].launch).toMatchObject({
      availability: "available",
      url: "https://invoice.app.corely.one/",
    });
    expect(items[1].launch).toMatchObject({ availability: "app-disabled" });
    expect(items[1].launch?.url).toBeUndefined();
    expect(items[0]).not.toHaveProperty("permissions");
    expect(items[0]).not.toHaveProperty("configJson");
    const missingConfig = new ListAppCatalogUseCase(f.registry, f.installs, {});
    expect((await missingConfig.execute("tenant-a"))[0].launch).toMatchObject({
      availability: "unconfigured",
    });
  });

  it("scopes installation state to the requested tenant and keeps absent context disabled", async () => {
    const f = fixture([released(invoicesAppManifest)]);
    const noTenant = await f.useCase.execute(null);
    expect(f.listByTenant).not.toHaveBeenCalled();
    expect(noTenant[0]).toMatchObject({ enabled: false, launch: { availability: "app-disabled" } });
    expect(noTenant[0]).toMatchObject({
      menu: invoicesAppManifest.menu,
      permissions: invoicesAppManifest.permissions,
    });
    expect((await f.useCase.execute("tenant-b"))[0].launch?.url).toBeUndefined();
    expect(f.listByTenant).toHaveBeenCalledWith("tenant-b");
  });
});
