import { expect, test, type BrowserContext } from "@playwright/test";
import { ExpenseDtoSchema } from "@corely/contracts";
import { shellConfig } from "../../../../packages/web-shared/testkit/workspace-config-fixture";
import { legacyInvoiceTransport } from "../invoice-links/legacy-invoice-fixture";

// Route-mocked UI coverage: no real credentials, database writes or financial actions.
async function expensesTransport(context: BrowserContext, granted = true) {
  await legacyInvoiceTransport(context);
  const expense = ExpenseDtoSchema.parse({
    id: "expense-a",
    tenantId: "tenant-a",
    status: "DRAFT",
    expenseDate: "2026-11-20",
    merchantName: "Example Stationery",
    currency: "EUR",
    totalAmountCents: 1000,
    createdAt: "2026-11-20T10:00:00Z",
    updatedAt: "2026-11-20T10:00:00Z",
    lines: [],
    receipts: [],
  });
  await context.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/config")) {
        const config = shellConfig("invoice");
        delete config.launchId;
        config.workspaceId = "workspace-a";
        config.navigation.groups.push({
          id: "expenses",
          labelKey: "nav.expenses",
          defaultLabel: "Expenses",
          order: 2,
          items: granted
            ? [
                {
                  id: "expenses",
                  label: "Expenses",
                  labelKey: "nav.expenses",
                  route: "/expenses",
                  icon: "Receipt",
                  section: "expenses",
                  order: 1,
                },
              ]
            : [],
        });
        config.home.widgets = [
          {
            id: "quick-actions",
            widgetType: "quick-actions",
            order: 1,
            titleKey: "dashboard.quickActions",
            defaultTitle: "Quick actions",
            size: "full",
            config: {
              actions: [
                { id: "create-invoice", route: "/invoices/new", labelKey: "invoices.newInvoice" },
              ],
            },
          },
        ];
        return route.fulfill({ json: config });
      }
      if (path === "/api/expenses") {
        return route.fulfill({
          json: {
            items: [expense],
            pageInfo: { page: 1, pageSize: 20, total: 1, hasNextPage: false },
          },
        });
      }
      if (path === "/api/expenses/expense-a") {
        return route.fulfill({ json: { expense } });
      }
      if (
        path === "/api/platform/dimensions/types" ||
        path === "/api/platform/custom-fields/indexed" ||
        path === "/api/customization/custom-fields"
      ) {
        return route.fulfill({ json: [] });
      }
      if (path.startsWith("/api/customization/layouts/")) {
        return route.fulfill({ json: null });
      }
      if (path === "/api/platform/dimensions/entities/expense/expense-a") {
        return route.fulfill({
          json: { entityRef: { entityType: "expense", entityId: "expense-a" }, assignments: [] },
        });
      }
      if (path === "/api/platform/custom-fields/entities/expense/expense-a") {
        return route.fulfill({
          json: { entityRef: { entityType: "expense", entityId: "expense-a" }, values: {} },
        });
      }
      return route.fallback();
    }
  );
}

for (const path of [
  "/expenses",
  "/expenses/new",
  "/expenses/expense-a",
  "/expenses/expense-a/edit",
]) {
  test(`${path} keeps only Expenses navigation`, async ({ page, context }) => {
    await expensesTransport(context);
    await page.goto(`${path}?lang=en`);
    const nav = page.getByTestId("sidebar-nav");
    await expect(nav.getByRole("link")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Expenses", exact: true })).toBeVisible();
    if (path.endsWith("/new") || path.endsWith("/edit")) {
      await expect(page.getByRole("textbox", { name: "Merchant", exact: true })).toBeVisible();
      if (path.endsWith("/edit")) {
        await expect(page.getByRole("textbox", { name: "Merchant", exact: true })).toHaveValue(
          "Example Stationery"
        );
      }
    } else {
      await expect(page.getByText("Example Stationery", { exact: true }).first()).toBeVisible();
    }
  });
}

test("command palette and reload retain the scoped shell and App Center return", async ({
  page,
  context,
}, testInfo) => {
  await expensesTransport(context);
  await page.goto("/expenses?lang=en");
  await expect(
    page.getByTestId("sidebar-nav").getByRole("link", { name: "Expenses", exact: true })
  ).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("option", { name: /Expenses/ })).toHaveCount(1);
  await expect(dialog.getByText(/invoice/i)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByTestId("sidebar-nav").getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "All apps", exact: true })).toHaveAttribute(
    "href",
    "https://app.corely.test:8443/?workspaceId=workspace-a&lang=en"
  );
  await page.screenshot({ path: testInfo.outputPath("expenses-desktop.png"), fullPage: true });
});

test("mobile navigation contains only Expenses and closes after selecting it", async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expensesTransport(context);
  await page.goto("/expenses/new?lang=en");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  const nav = page.getByTestId("sidebar-nav-mobile");
  await expect(nav.getByRole("link")).toHaveCount(1);
  await expect(nav.getByRole("link", { name: "Expenses", exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("expenses-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await nav.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(nav).not.toBeInViewport();
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
});

test("does not invent an ungranted Expenses entry or fall back to unrelated apps", async ({
  page,
  context,
}) => {
  await expensesTransport(context, false);
  await page.goto("/expenses?lang=en");
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
  await expect(page.getByTestId("sidebar-nav").getByRole("link")).toHaveCount(0);
});
