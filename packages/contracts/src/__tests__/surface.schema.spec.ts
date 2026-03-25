import { describe, expect, it } from "vitest";
import { AppManifestSchema } from "../platform/app-manifest.schema";
import { isSurfaceAllowed, resolveSurface } from "../platform/surface.schema";

describe("surface schema", () => {
  it("resolves known product hosts and local fallbacks", () => {
    expect(resolveSurface("pos.corely.one")).toBe("pos");
    expect(resolveSurface("restaurant.localhost:5173")).toBe("pos");
    expect(resolveSurface("crm.corely.one")).toBe("crm");
    expect(resolveSurface("app.corely.one")).toBe("platform");
    expect(resolveSurface("localhost:3000")).toBe("platform");
  });

  it("treats shared surfaces as globally allowed", () => {
    expect(isSurfaceAllowed("crm", ["shared"])).toBe(true);
    expect(isSurfaceAllowed("pos", ["platform", "crm"])).toBe(false);
  });

  it("parses manifest-level and menu-level allowed surfaces", () => {
    const parsed = AppManifestSchema.parse({
      appId: "crm",
      name: "CRM",
      tier: 2,
      version: "1.0.0",
      dependencies: [],
      allowedSurfaces: ["platform", "crm"],
      capabilities: [],
      permissions: [],
      menu: [
        {
          id: "crm-dashboard",
          scope: "web",
          section: "crm",
          labelKey: "nav.crmDashboard",
          defaultLabel: "Dashboard",
          route: "/crm",
          icon: "LayoutDashboard",
          order: 10,
          allowedSurfaces: ["crm"],
        },
      ],
    });

    expect(parsed.allowedSurfaces).toEqual(["platform", "crm"]);
    expect(parsed.menu[0]?.allowedSurfaces).toEqual(["crm"]);
  });
});
