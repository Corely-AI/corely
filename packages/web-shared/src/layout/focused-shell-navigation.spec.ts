import { describe, expect, it } from "vitest";
import {
  buildWorkspaceLaunchUrl,
  focusedActions,
  focusedNavigation,
  isFocusedRoute,
} from "./focused-shell-navigation";
import { shellConfig } from "../../testkit/browser/focused-shell-fixture";
const routeRoots = ["/invoices", "/audit"];

describe("focused navigation boundary", () => {
  it("fails closed on unscoped and wrong-workspace projections", () => {
    expect(focusedNavigation("invoice", "other", shellConfig("invoice"), routeRoots)).toEqual([]);
    expect(
      focusedNavigation("invoice", "synthetic-workspace", shellConfig("hr"), routeRoots)
    ).toEqual([]);
    expect(focusedNavigation("invoice", "synthetic-workspace", undefined, routeRoots)).toEqual([]);
  });
  it.each([
    "/people",
    "/tasks",
    "/booking",
    "/accounting",
    "/settings",
    "//evil.invalid/invoices",
    "https://evil.invalid/invoices",
    "/invoices/../people",
    "/invoices/%2fpeople",
    "/invoices-other",
  ])("rejects unrelated or unsafe route %s", (route) => {
    expect(isFocusedRoute(route, routeRoots)).toBe(false);
  });
  it("uses one granted menu boundary for links, settings and quick actions", () => {
    const config = shellConfig("invoice");
    config.navigation.groups[0].items.push({
      ...config.navigation.groups[0].items[0],
      id: "hr",
      label: "HR",
      route: "/people/staff",
    });
    const groups = focusedNavigation("invoice", "synthetic-workspace", config, routeRoots);
    expect(groups.flatMap((group) => group.items).map((item) => item.id)).toEqual(["invoices"]);
    expect(
      focusedActions(
        groups,
        [
          { id: "create", menuItemId: "invoices", route: "/invoices/new", label: "New invoice" },
          { id: "hr", menuItemId: "invoices", route: "/people/new", label: "New staff" },
          { id: "ungranted", menuItemId: "hidden", route: "/invoices/new", label: "Hidden" },
        ],
        routeRoots
      ).map((action) => action.id)
    ).toEqual(["create"]);
  });
  it("only constructs a workspace hint against an exact safe origin", () => {
    expect(
      buildWorkspaceLaunchUrl("https://invoice.app.corely.one/", "a&tenantId=other")
    ).toBeUndefined();
    for (const origin of [
      "javascript:alert(1)",
      "https://user:pass@evil.invalid",
      "https://good.invalid/?next=evil",
      "https://good.invalid/path",
    ]) {
      expect(buildWorkspaceLaunchUrl(origin, "workspace")).toBeUndefined();
    }
  });
});
