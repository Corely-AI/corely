import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import type { AppCatalogItem } from "@corely/contracts";
import { ListAppLaunchesUseCase } from "../application/use-cases/list-app-launches.usecase";
import { ListAppCatalogUseCase } from "../application/use-cases/list-app-catalog.usecase";
import {
  ComposeMenuUseCase,
  type ComposeMenuInput,
} from "../application/use-cases/compose-menu.usecase";

describe("staff launch projection", () => {
  it("projects existing destinations only from the app's granted entry and enabled dependencies", async () => {
    const catalog = mockDeep<ListAppCatalogUseCase>();
    const menus = mockDeep<ComposeMenuUseCase>();
    const input: ComposeMenuInput = {
      tenantId: "tenant",
      userId: "user",
      workspaceId: "studio",
      permissions: ["crm.deals.read"],
      scope: "web",
      surfaceId: "platform",
      surfaceResolutionSource: "fallback",
      surfaceHeaderMismatch: false,
      route: "/menu/launches",
    };
    const app: AppCatalogItem = {
      appId: "crm",
      name: "CRM",
      tier: 2,
      version: "1",
      enabled: true,
      dependencies: ["parties"],
      directory: {
        menuId: "crm-deals",
        category: "sales",
        displayName: { en: "CRM", de: "CRM", vi: "CRM" },
      },
    };
    const menuItem = {
      id: "crm-deals",
      label: "Deals",
      section: "crm",
      icon: "Users",
      order: 1,
      route: "/crm/deals",
    };
    const base = { scope: "web", computedAt: "now", surfaceId: "platform" as const };
    catalog.execute.mockResolvedValue([
      app,
      { ...app, appId: "parties", directory: undefined, dependencies: [] },
    ]);
    menus.execute.mockResolvedValue({
      ...base,
      items: [menuItem],
      groups: [{ appId: "crm", defaultLabel: "CRM", items: [menuItem] }],
    });
    const service = new ListAppLaunchesUseCase(catalog, menus, { legacy: "http://localhost:5173" });
    expect(await service.execute(input)).toMatchObject([
      {
        appId: "crm",
        dependencies: [],
        directory: { destination: { origin: "http://localhost:5173", path: "/crm/deals" } },
      },
    ]);
    expect(menus.execute).toHaveBeenCalledWith({ ...input, launchId: undefined });
    expect(
      (await new ListAppLaunchesUseCase(catalog, menus).execute(input))[0]?.directory?.destination
    ).toBeUndefined();
    catalog.execute.mockResolvedValue([app]); // Missing dependency.
    expect(await service.execute(input)).toEqual([]);
    catalog.execute.mockResolvedValue([{ ...app, dependencies: [], enabled: false }]);
    expect(await service.execute(input)).toEqual([]);
    catalog.execute.mockResolvedValue([{ ...app, dependencies: [] }]);
    menus.execute.mockResolvedValue({ ...base, items: [], groups: [] }); // Hidden/revoked entry.
    expect(await service.execute(input)).toEqual([]);
    menus.execute.mockResolvedValue({
      ...base,
      items: [menuItem],
      groups: [{ appId: "other", defaultLabel: "Other", items: [menuItem] }],
    });
    expect(await service.execute(input)).toEqual([]); // An unrelated menu cannot grant the app.
  });
  it("only projects apps with granted navigation, retaining unavailable reasons and trusted scope", async () => {
    const catalog = mockDeep<ListAppCatalogUseCase>();
    const menus = mockDeep<ComposeMenuUseCase>();
    const input: ComposeMenuInput = {
      tenantId: "tenant",
      userId: "user",
      workspaceId: "workspace",
      permissions: ["invoices.read"],
      scope: "web",
      surfaceId: "platform",
      surfaceResolutionSource: "fallback",
      surfaceHeaderMismatch: false,
      route: "/menu/launches",
    };
    const invoice: AppCatalogItem = {
      appId: "invoices",
      name: "Invoices",
      tier: 1,
      version: "1",
      dependencies: ["parties"],
      enabled: true,
      launch: {
        launchId: "invoice",
        surfaceId: "platform",
        displayName: { en: "Invoice", de: "Rechnung", vi: "Hóa đơn" },
        category: "finance",
        iconKey: "FileText",
        availability: "unconfigured",
      },
    };
    const hr: AppCatalogItem = {
      ...invoice,
      appId: "people",
      launch: { ...invoice.launch!, launchId: "hr" },
    };
    catalog.execute.mockResolvedValue([
      invoice,
      hr,
      { ...invoice, appId: "legacy", launch: undefined },
    ]);
    menus.execute.mockImplementation(async (context) => ({
      scope: "web",
      groups: [],
      items:
        context.launchId === "invoice"
          ? [{ id: "invoices", label: "Invoices", section: "finance", icon: "FileText", order: 1 }]
          : [],
      computedAt: "now",
      surfaceId: "platform",
    }));
    expect(await new ListAppLaunchesUseCase(catalog, menus).execute(input)).toEqual([
      { ...invoice, dependencies: [] },
    ]);
    expect(catalog.execute).toHaveBeenCalledWith("tenant");
    expect(menus.execute).toHaveBeenCalledWith({ ...input, launchId: "invoice" });
    expect(menus.execute).toHaveBeenCalledWith({ ...input, launchId: "hr" });
  });
});
