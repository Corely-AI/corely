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
