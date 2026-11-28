import type { BrowserContext } from "@playwright/test";
import { invoiceFixture } from "../focused-invoice/invoice-fixture";
import { shellConfig } from "../../../../packages/web-shared/testkit/workspace-config-fixture";
import {
  workspaceFixtureResponse,
  fixtureOrigins,
} from "../../../../packages/web-shared/testkit/workspace-api-fixture";
export async function legacyInvoiceTransport(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem(
      "accessToken",
      `synthetic.${btoa(JSON.stringify({ exp: 4102444800 }))}.unsigned`
    );
    localStorage.setItem("refreshToken", "synthetic-unused");
    localStorage.setItem("corely-active-workspace", "workspace-a");
  });
  const requests: string[] = [];
  await context.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      requests.push(path);
      if (path === "/api/auth/me") {
        await route.fulfill({
          json: {
            userId: "user-a",
            email: "synthetic@example.invalid",
            name: "Alex Example",
            activeTenantId: "tenant-a",
            activeWorkspaceId: "workspace-a",
            memberships: [
              { tenantId: "tenant-a", tenantName: "Linden", roleId: "admin", roleName: "Admin" },
            ],
          },
        });
        return;
      }
      if (path === "/api/workspaces") {
        const result = workspaceFixtureResponse(
          "/api/bff/workspaces",
          new Headers({ "x-tenant-id": "tenant-a" }),
          "user-a",
          "invoice",
          fixtureOrigins(url.port)
        );
        await route.fulfill({ json: await result.json() });
        return;
      }
      if (path.endsWith("/config")) {
        await route.fulfill({ json: { ...shellConfig("invoice"), workspaceId: "workspace-a" } });
        return;
      }
      if (path === "/api/menu/launches") {
        const result = workspaceFixtureResponse(
          "/api/bff/menu/launches",
          new Headers(),
          "user-a",
          "invoice",
          fixtureOrigins(url.port)
        );
        await route.fulfill({ json: await result.json() });
        return;
      }
      if (path === "/api/identity/permissions/effective") {
        await route.fulfill({ json: { permissions: { allowAll: true, allowed: [], denied: [] } } });
        return;
      }
      if (path === "/api/invoices") {
        await route.fulfill({
          json: {
            items: [invoiceFixture()],
            pageInfo: { page: 1, pageSize: 20, total: 1, hasNextPage: false },
          },
        });
        return;
      }
      if (path.startsWith("/api/invoices/")) {
        await route.fulfill({ json: { invoice: invoiceFixture() } });
        return;
      }
      if (path === "/api/customers") {
        await route.fulfill({ json: { customers: [] } });
        return;
      }
      if (path.includes("notifications")) {
        await route.fulfill({ json: { items: [], unreadCount: 0 } });
        return;
      }
      await route.fulfill({ json: { items: [], groups: [], apps: [], features: [] } });
    }
  );
  return requests;
}
