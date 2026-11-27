import type { WorkspaceNavigationGroup } from "@corely/contracts";
import { describe, expect, it } from "vitest";
import { resolveBackofficeNavigation } from "./backoffice-navigation";

const groups: WorkspaceNavigationGroup[] = [
  "ai-copilot",
  "booking",
  "catalog",
  "cash-management",
  "classes",
  "cms",
  "coaching-engagements",
  "crm",
  "expenses",
  "forms",
  "import",
  "invoices",
  "issues",
  "parties",
  "people",
  "portfolio",
  "purchasing",
  "rentals",
  "sales",
  "sign",
  "tasks",
  "tax",
  "website",
].map((id, order) => ({ id, order, labelKey: id, defaultLabel: id, items: [] }));

describe("Backoffice app navigation", () => {
  it.each([
    ["/sign", "?workspaceId=workspace-a", "sign"],
    ["/sign/settings", "", "sign"],
    ["/sign/templates", "", "sign"],
    ["/sign/templates/template/edit", "?coaching=engagement", "sign"],
    ["/sign/requests/new", "", "sign"],
    ["/sign/requests/request", "", "sign"],
    ["/invoices", "", "invoices"],
    ["/sales/invoices/draft/edit", "", "invoices"],
    ["/audit", "?entity=invoice&id=draft", "invoices"],
    ["/expenses/draft/edit", "", "expenses"],
    ["/crm/deals", "", "crm"],
    ["/settings/engagement/templates", "", "crm"],
    ["/tasks/templates", "", "tasks"],
    ["/people/staff/profile/lifecycle", "", "people"],
    ["/booking/resources", "", "booking"],
    ["/openbuk/app", "", "booking"],
    ["/assistant/t/thread", "", "ai-copilot"],
    ["/cash/settings", "", "cash-management"],
    ["/cash-registers/register/daily-close", "", "cash-management"],
    ["/catalog/items/product/edit", "", "catalog"],
    ["/dashboard/teacher", "", "classes"],
    ["/class-groups/group/edit", "", "classes"],
    ["/classes/cohorts/group", "", "classes"],
    ["/programs/program/edit", "", "classes"],
    ["/students/student/edit", "", "classes"],
    ["/sessions/session", "", "classes"],
    ["/billing", "", "classes"],
    ["/cms/posts/post/edit", "", "cms"],
    ["/coaching/offers/offer/edit", "", "coaching-engagements"],
    ["/forms/new", "", "forms"],
    ["/import/shipments/shipment", "", "import"],
    ["/issues/issue", "", "issues"],
    ["/customers/customer/edit", "", "parties"],
    ["/suppliers/new", "", "parties"],
    ["/portfolio/projects/project/edit", "", "portfolio"],
    ["/purchasing/vendor-bills/bill/pay", "", "purchasing"],
    ["/rentals/properties/property/edit", "", "rentals"],
    ["/sales/orders/order/edit", "", "sales"],
    ["/tax/annual/2026/t/thread", "", "tax"],
    ["/taxes", "", "tax"],
    ["/settings/tax", "", "tax"],
    ["/website/pages/page/edit", "", "website"],
  ])("selects the owning app group for %s", (pathname, search, appId) => {
    expect(resolveBackofficeNavigation(pathname, search, groups)).toEqual({
      groups: groups.filter((group) => group.id === appId),
      scope: "app",
    });
  });

  it.each([
    "/invoices/public/invitation",
    "/crm-tools",
    "/signature",
    "/openbuk",
    "/pos/admin/registers",
    "/restaurant/kitchen-queue",
    "/directory/restaurants",
    "/accounting/setup",
    "/inventory/stock",
    "/settings/tenants",
  ])("keeps workspace navigation on %s", (pathname) => {
    const navigation = resolveBackofficeNavigation(pathname, "", groups);
    expect(navigation.groups).toBe(groups);
    expect(navigation.scope).toBe("workspace");
  });

  it.each([
    ["crm", "/assistant/t/thread"],
    ["crm", "/notifications"],
    ["pos", "/cash/registers/register"],
    ["pos", "/cash-registers/register"],
  ] as const)("keeps the %s host's menu on %s", (surface, pathname) => {
    expect(resolveBackofficeNavigation(pathname, "", groups, surface)).toEqual({
      groups,
      scope: "workspace",
    });
  });

  it.each([
    "/dashboard",
    "/apps",
    "/settings",
    "/settings/workspace",
    "/settings/payment-methods",
    "/settings/members",
    "/settings/roles/admin/permissions",
    "/settings/classes",
    "/settings/custom-attributes/dimensions",
    "/settings/platform/menu",
    "/freelancer/settings",
    "/notifications",
    "/cash/billing",
  ])("keeps general links on %s", (pathname) => {
    const item = (id: string, route: string) => ({
      id,
      route,
      label: id,
      icon: "Settings",
      section: "test",
      order: 1,
    });
    const group = (id: string, items: WorkspaceNavigationGroup["items"]) => ({
      id,
      items,
      labelKey: id,
      defaultLabel: id,
      order: 1,
    });

    const navigation = resolveBackofficeNavigation(pathname, "", [
      group("core", [item("dashboard", "/dashboard")]),
      group("cash-management", [
        item("cash-billing", "/cash/billing"),
        item("cash-settings", "/cash/settings"),
      ]),
      group("invoices", [item("invoices", "/invoices")]),
      group("classes", [item("class-billing", "/billing")]),
    ]);

    expect(navigation.scope).toBe("general");
    expect(navigation.groups.flatMap((entry) => entry.items.map((link) => link.route))).toEqual([
      "/dashboard",
      "/cash/billing",
      "/settings",
    ]);
  });

  it("does not add menu entries the workspace did not grant", () => {
    expect(
      resolveBackofficeNavigation(
        "/sign/requests",
        "",
        groups.filter(({ id }) => id !== "sign")
      )
    ).toEqual({
      groups: [],
      scope: "app",
    });
  });
});
