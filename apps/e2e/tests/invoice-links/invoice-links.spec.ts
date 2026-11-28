import { test, expect } from "@playwright/test";
import { legacyInvoiceTransport } from "./legacy-invoice-fixture";
test("opens an invoice deep link directly in the backoffice", async ({
  page,
  context,
}) => {
  const requests = await legacyInvoiceTransport(context);
  await page.goto("/invoices?page=2&q=INV&token=discard&workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-row-invoice-1")).toBeVisible();
  await expect(page).toHaveURL(/127\.0\.0\.1.*\/invoices/);
  const link = page.getByRole("link", { name: "Open in Invoice", exact: true });
  await expect(link).toHaveCount(0);
  expect(requests).not.toContain("/api/menu/launches");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("invoice-row-invoice-1")).toBeVisible();
});

test("opens Studio and the app directory in the same workspace session", async ({ page, context }) => {
  await legacyInvoiceTransport(context);
  const workspaces: string[] = [];
  await context.route("**/api/openbuk/**", async route => {
    workspaces.push(await route.request().headerValue("x-workspace-id") ?? "");
    const studio = new URL(route.request().url()).pathname.endsWith("/studio");
    await route.fulfill({ json: studio ? { studio: null, canManage: true } : { draft: null } });
  });
  await page.goto("/openbuk/app");
  await expect(page.locator(".openbuk-embedded form").first()).toBeVisible();
  expect(workspaces).toEqual(["workspace-a", "workspace-a"]);
  await page.getByRole("link", { name: "All apps" }).first().click();
  await expect(page.getByRole("heading", { name: "All apps" })).toBeVisible();
  await expect(page).toHaveURL(/\/apps$/);
});
