import { test, expect } from "@playwright/test";
import type { UpdateVendorBillInput, VendorBillDto } from "@corely/contracts";
import { legacyInvoiceTransport } from "./legacy-invoice-fixture";

test("enables workspace invoice email and reviews a forwarded bill", async ({
  page,
  context,
}, info) => {
  await legacyInvoiceTransport(context);
  const address = "invoice+workspace-a@invoices.example.invalid";
  let enabled = false;
  let settingsAllowed = true;
  const draft: VendorBillDto = {
    id: "email-invoice-1",
    tenantId: "tenant-a",
    status: "DRAFT",
    sourceFilename: "supplier-invoice.pdf",
    supplierPartyId: null,
    billNumber: null,
    billDate: null,
    dueDate: null,
    currency: null,
    lineItems: [],
    totals: { subtotalCents: 0, taxCents: 0, totalCents: 0, paidCents: 0, dueCents: 0 },
    createdAt: "2026-11-27T08:00:00.000Z",
    updatedAt: "2026-11-27T08:00:00.000Z",
  };
  const secondDraft = { ...draft, id: "email-invoice-2", sourceFilename: "supplier-invoice.png" };

  await context.route("**/api/purchasing/invoice-email/settings", async (route) => {
    expect(await route.request().headerValue("x-workspace-id")).toBe("workspace-a");
    if (!settingsAllowed) {
      await route.fulfill({ status: 403, json: { message: "Workspace access denied" } });
      return;
    }
    if (route.request().method() === "PATCH") {
      enabled = route.request().postDataJSON().enabled;
    }
    await route.fulfill({ json: { available: true, enabled, address } });
  });
  await context.route("**/api/purchasing/invoice-email/bills/*/original", (route) =>
    route.fulfill({
      json: { url: `${new URL(route.request().url()).origin}/invoice-original-fixture` },
    })
  );
  await context.route("**/invoice-original-fixture", (route) =>
    route.fulfill({ body: "Synthetic original invoice", contentType: "text/plain" })
  );
  await context.route("**/api/purchasing/suppliers*", (route) =>
    route.fulfill({ json: { suppliers: [{ id: "supplier-a", displayName: "Example Supplier" }] } })
  );
  await context.route("**/api/purchasing/vendor-bills**", async (route) => {
    const request = route.request();
    expect(await request.headerValue("x-workspace-id")).toBe("workspace-a");
    const path = new URL(request.url()).pathname;
    if (path === "/api/purchasing/vendor-bills") {
      await route.fulfill({ json: { items: [draft, secondDraft], nextCursor: null } });
      return;
    }
    if (request.method() === "PATCH") {
      const body: UpdateVendorBillInput = request.postDataJSON();
      expect(body.headerPatch).toMatchObject({
        supplierPartyId: "supplier-a",
        billNumber: "INV-42",
        currency: "EUR",
      });
      expect(body.lineItems).toEqual([
        expect.objectContaining({ description: "Supplies", quantity: 1, unitCostCents: 2500 }),
      ]);
      Object.assign(draft, body.headerPatch, {
        lineItems: body.lineItems,
        totals: {
          subtotalCents: 2500,
          taxCents: 0,
          totalCents: 2500,
          paidCents: 0,
          dueCents: 2500,
        },
      });
    } else if (path.endsWith("/approve")) {
      expect(draft.billNumber).toBe("INV-42");
      draft.status = "APPROVED";
    }
    await route.fulfill({ json: { vendorBill: draft } });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings/workspace?workspaceId=workspace-a");
  const toggle = page.getByRole("switch", { name: "Enable invoice email" });
  await expect(toggle).not.toBeChecked();
  await expect(page.getByLabel("Forwarding address")).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect(page.getByLabel("Forwarding address")).toHaveValue(address);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByText("Address copied", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(address);
  await page.screenshot({ path: info.outputPath("invoice-email-workspace-settings.png") });
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(page.getByLabel("Forwarding address")).toHaveCount(0);
  settingsAllowed = false;
  const denied = page.waitForResponse(
    (response) => response.url().endsWith("/invoice-email/settings") && response.status() === 403
  );
  await page.reload();
  await denied;
  await expect(toggle).toHaveCount(0);

  await page.goto("/purchasing/vendor-bills?workspaceId=workspace-a");
  await expect(page.getByRole("link", { name: "supplier-invoice.png" })).toBeVisible();
  await page.getByRole("link", { name: "supplier-invoice.pdf" }).click();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Bill number")).toHaveValue("");
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open original" }).click();
  const original = await popup;
  await expect(original.getByText("Synthetic original invoice")).toBeVisible();
  await original.close();
  await page.screenshot({ path: info.outputPath("invoice-email-empty-draft.png") });

  await page.getByLabel("Supplier", { exact: true }).selectOption("supplier-a");
  await page.getByLabel("Bill number").fill("INV-42");
  await page.getByLabel("Bill date").fill("2026-11-27");
  await page.getByLabel("Due date").fill("2026-12-11");
  await page.getByLabel("Currency").fill("EUR");
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByLabel("Description", { exact: true }).fill("Supplies");
  await page.getByLabel("Unit cost (minor units)").fill("2500");
  await page.getByRole("button", { name: "Save draft" }).click();
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  await expect(approve).toBeEnabled();
  await page.screenshot({ path: info.outputPath("invoice-email-draft-review.png") });
  await approve.click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Original invoice" })).toBeVisible();
  await page.screenshot({
    path: info.outputPath("invoice-email-approved-phone.png"),
    fullPage: true,
  });
  await page.goto("/purchasing/vendor-bills?workspaceId=workspace-a");
  await expect(page.getByRole("row").filter({ hasText: "INV-42" })).toContainText("Approved");
});
