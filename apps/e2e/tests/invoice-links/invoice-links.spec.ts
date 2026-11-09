import { test, expect } from "@playwright/test";
import { legacyInvoiceTransport } from "./legacy-invoice-fixture";
test("keeps legacy invoices and offers only an approved opt-in handoff", async ({
  page,
  context,
}, info) => {
  const requests = await legacyInvoiceTransport(context);
  await page.goto("/invoices?page=2&q=INV&token=discard&workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-row-invoice-1")).toBeVisible();
  await expect(page).toHaveURL(/127\.0\.0\.1.*\/invoices/);
  const link = page.getByRole("link", { name: "Open in Invoice", exact: true });
  if (info.project.name === "rollback") {
    await expect(link).toHaveCount(0);
    expect(requests).not.toContain("/api/menu/launches");
    return;
  }
  await expect(link).toBeVisible();
  const target = new URL((await link.getAttribute("href"))!);
  expect(target.hostname).toBe("invoice.localhost");
  expect(target.pathname).toBe("/invoices");
  expect(target.searchParams.get("workspaceId")).toBe("workspace-a");
  expect(target.searchParams.get("q")).toBe("INV");
  expect(target.searchParams.has("token")).toBe(false);
  await page.screenshot({ path: info.outputPath("legacy-invoice-handoff-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(link).toBeInViewport();
  await page.screenshot({ path: info.outputPath("legacy-invoice-handoff-mobile.png") });
  await page.goto("/invoices/invoice-1/edit?workspaceId=workspace-b");
  await expect(link).toHaveCount(0);
});
