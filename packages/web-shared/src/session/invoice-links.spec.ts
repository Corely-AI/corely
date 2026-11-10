import { describe, expect, it } from "vitest";
import { AppCatalogItemSchema } from "@corely/contracts";
import {
  buildInvoiceDestinationLink,
  invoiceLegacyRoute,
  invoiceLinkMigrationEnabled,
} from "./invoice-links";
const invoice = AppCatalogItemSchema.parse({
  appId: "invoices",
  name: "Invoices",
  version: "1",
  tier: 1,
  dependencies: [],
  enabled: true,
  launch: {
    launchId: "invoice",
    surfaceId: "platform",
    displayName: { en: "Invoice", de: "Rechnungen", vi: "Hóa đơn" },
    category: "finance",
    iconKey: "FileText",
    availability: "available",
    url: "https://invoice.app.corely.one/",
  },
});
describe("reversible legacy invoice links", () => {
  it.each([
    "/invoices",
    "/invoices/new",
    "/invoices/invoice-1",
    "/invoices/invoice-1/edit",
    "/audit?entity=invoice&id=invoice-1",
  ])("maps %s to its exact record route and selected workspace", (route) => {
    const url = new URL(buildInvoiceDestinationLink(invoice, "workspace-a", route)!);
    expect(url.origin).toBe("https://invoice.app.corely.one");
    expect(url.pathname).toBe(route.split("?")[0]);
    expect(url.searchParams.get("workspaceId")).toBe("workspace-a");
  });
  it("preserves approved list state and strips identity, redirects and hashes", () => {
    const filters = JSON.stringify([{ field: "status", operator: "eq", value: "ISSUED" }]);
    const url = new URL(
      buildInvoiceDestinationLink(
        invoice,
        "workspace-a",
        `/invoices?page=2&q=INV&filters=${encodeURIComponent(filters)}&token=secret&tenantId=other&returnUrl=https://evil.test#code=secret`
      )!
    );
    expect(url.searchParams.get("filters")).toBe(filters);
    expect(url.searchParams.get("q")).toBe("INV");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.href).not.toMatch(/secret|tenantId|returnUrl|evil/);
    expect(url.hash).toBe("");
  });
  it.each([
    "/people/staff",
    "/portal/invoices/id",
    "/invoices/public/id/token",
    "/w/studio/invoices/id",
    "/invoices/id/send",
    "/audit?entity=person&id=staff",
    "/audit?entity=invoice&id=a&id=b",
    "//evil.test/invoices/id",
    "/invoices/%2e%2e/people",
    "/invoices/id?workspaceId=workspace-b",
    "/invoices/id?workspaceId=workspace-a&workspaceId=workspace-a",
  ])("never remaps unrelated/public/ambiguous route %s", (route) => {
    expect(invoiceLegacyRoute(route, "workspace-a")).toBeUndefined();
  });
  it("fails closed for disabled/unavailable launches and has explicit cohort rollback", () => {
    expect(
      buildInvoiceDestinationLink({ ...invoice, enabled: false }, "workspace-a", "/invoices/id")
    ).toBeUndefined();
    expect(invoiceLinkMigrationEnabled(undefined, "workspace-a", "workspace-a")).toBe(false);
    expect(invoiceLinkMigrationEnabled("true", "workspace-b", "workspace-a")).toBe(false);
    expect(invoiceLinkMigrationEnabled("true", "workspace-a", "workspace-a")).toBe(true);
    expect(invoiceLinkMigrationEnabled("false", "workspace-a", "workspace-a")).toBe(false);
    expect(invoiceLinkMigrationEnabled("true", "workspace-a,", "workspace-a")).toBe(false);
  });
});
