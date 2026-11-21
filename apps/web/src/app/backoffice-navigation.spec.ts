import type { WorkspaceNavigationGroup } from "@corely/contracts";
import { describe, expect, it } from "vitest";
import { resolveBackofficeNavigation } from "./backoffice-navigation";

const groups: WorkspaceNavigationGroup[] = [
  "invoices",
  "expenses",
  "crm",
  "tasks",
  "people",
  "booking",
  "cash-management",
].map((id, order) => ({ id, order, labelKey: id, defaultLabel: id, items: [] }));

describe("Backoffice app navigation", () => {
  it.each([
    ["/sales/invoices/draft/edit", "", "invoices"],
    ["/audit", "?entity=invoice&id=draft", "invoices"],
    ["/expenses/draft/edit", "", "expenses"],
    ["/crm/deals", "", "crm"],
    ["/settings/engagement/templates", "", "crm"],
    ["/tasks/templates", "", "tasks"],
    ["/people/staff/profile/lifecycle", "", "people"],
    ["/booking/resources", "", "booking"],
    ["/openbuk/app", "", "booking"],
  ])("selects the owning app group for %s", (pathname, search, appId) => {
    expect(resolveBackofficeNavigation(pathname, search, groups)).toEqual({
      groups: groups.filter((group) => group.id === appId),
      scope: "app",
    });
  });

  it.each([
    "/invoices/public/invitation",
    "/crm-tools",
    "/openbuk",
    "/dashboard/teacher",
    "/cash/settings",
    "/billing",
    "/settings/tenants",
  ])("keeps workspace navigation on %s", (pathname) => {
    const navigation = resolveBackofficeNavigation(pathname, "", groups);
    expect(navigation.groups).toBe(groups);
    expect(navigation.scope).toBe("workspace");
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
    expect(resolveBackofficeNavigation("/expenses", "", groups.slice(-1))).toEqual({
      groups: [],
      scope: "app",
    });
  });
});
