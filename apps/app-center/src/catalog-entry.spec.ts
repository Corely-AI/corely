import { describe, expect, it } from "vitest";
import type { AppCatalogItem } from "@corely/contracts";
import { catalogEntryUrl } from "./catalog-entry";

const app: AppCatalogItem = {
  appId: "crm",
  name: "CRM",
  tier: 2,
  version: "1",
  enabled: true,
  dependencies: [],
  directory: {
    menuId: "crm-deals",
    displayName: { en: "CRM", de: "CRM", vi: "CRM" },
    category: "sales",
    destination: { origin: "http://localhost:5173", path: "/crm/deals" },
  },
};
describe("implemented catalog destinations", () => {
  it("carries only the selected workspace to the implemented route", () => {
    expect(catalogEntryUrl(app, "studio-a")).toBe(
      "http://localhost:5173/crm/deals?workspaceId=studio-a"
    );
    expect(catalogEntryUrl({ ...app, enabled: false }, "studio-a")).toBeUndefined();
    expect(catalogEntryUrl(app, "studio/a")).toBeUndefined();
    expect(catalogEntryUrl(app, "studio-a", "vi")).toBe(
      "http://localhost:5173/crm/deals?workspaceId=studio-a&lang=vi"
    );
  });
  it.each([
    "//evil.invalid",
    "/auth/login",
    "/crm?token=secret",
    "/crm/../settings",
    "/crm#redirect",
    "/crm/%2f",
  ])("rejects unsafe routes: %s", (path) => {
    expect(
      catalogEntryUrl(
        {
          ...app,
          directory: {
            ...app.directory!,
            destination: { origin: "https://admin.corely.one", path },
          },
        },
        "studio-a"
      )
    ).toBeUndefined();
  });
});
