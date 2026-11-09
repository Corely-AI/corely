import { test, expect } from "@playwright/test";
import { invoiceTransport } from "./invoice-fixture";

test("downloads a draft PDF through its owner without calling forbidden settings", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context, { pdf: true });
  await context.route("**/pdf-fixture", (route) =>
    route.fulfill({ contentType: "text/plain", body: "Synthetic invoice PDF destination" })
  );
  await page.goto("/invoices/invoice-1?workspaceId=workspace-a");
  const opened = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await expect.poll(() => fixture.requests.includes("/api/bff/invoices/invoice-1/pdf")).toBe(true);
  expect(fixture.requests.some((path) => path.startsWith("/api/bff/payment-methods"))).toBe(false);
  expect(fixture.commands.map((command) => command.path)).toEqual([
    "/api/bff/invoices/invoice-1/finalize",
  ]);
  await expect(page.getByRole("heading", { name: /Invoice INV-2026-101/ })).toBeVisible();
  const pdf = await opened;
  await expect(pdf).toHaveURL(/\/pdf-fixture$/);
  expect(await pdf.evaluate(() => window.opener)).toBeNull();
  await expect(
    page.getByText("Please allow pop-ups for this site and try again.", { exact: true })
  ).toBeHidden({ timeout: 500 });
  await page.screenshot({ path: testInfo.outputPath("invoice-pdf-owner-desktop.png") });
});

test("lists existing invoice records and restores bookmarked detail/edit/activity routes", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context);
  await page.goto("/?workspaceId=workspace-a");
  await expect(page).toHaveURL(/\/invoices\?workspaceId=workspace-a/);
  await expect(page.getByTestId("invoice-row-invoice-1")).toContainText("INV-2026-101");
  await expect(page.getByTestId("invoice-row-invoice-1")).toContainText("Linden Customer");
  await page.screenshot({ path: testInfo.outputPath("invoice-list-desktop.png") });
  await page.getByTestId("view-invoice-invoice-1").click();
  await expect(page).toHaveURL(/\/invoices\/invoice-1\?workspaceId=workspace-a/);
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.reload();
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.goto("/invoices/invoice-1/edit?workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.screenshot({ path: testInfo.outputPath("invoice-detail-desktop.png") });
  await page.goto("/audit?entity=invoice&id=invoice-1&workspaceId=workspace-a");
  await expect(page.getByText("Invoice created", { exact: true })).toBeVisible();
  expect(fixture.requests.some((path) => path.startsWith("/api/bff/audit"))).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("invoice-activity-mobile.png") });
});

test("creates through existing contracts with deterministic cents and scoped cookie transport", async ({
  page,
  context,
}) => {
  const fixture = await invoiceTransport(context);
  await context.addInitScript(() => {
    localStorage.setItem("accessToken", "stale-legacy-token");
    localStorage.setItem("corely-active-workspace", "workspace-b");
  });
  await page.goto("/invoices/new?workspaceId=workspace-a");
  await page.getByTestId("invoice-customer-select").click();
  await page.getByTestId("invoice-customer-option-customer-1").click();
  await page.getByTestId("invoice-line-description-0").fill("Scoped consulting");
  await page.getByTestId("invoice-line-qty-0").fill("2");
  await page.getByTestId("invoice-line-rate-0").fill("150");
  await page.getByTestId("submit-invoice-button").click();
  await expect(page).toHaveURL(/\/invoices\?workspaceId=workspace-a/);
  expect(fixture.commands.map((command) => command.path)).toEqual([
    "/api/bff/invoices",
    "/api/bff/invoices/created-1/finalize",
  ]);
  expect(fixture.commands[0].body).toMatchObject({
    customerPartyId: "customer-1",
    currency: "EUR",
    lineItems: [{ description: "Scoped consulting", qty: 2, unitPriceCents: 15000 }],
  });
  for (const command of fixture.commands) {
    expect(command.headers["x-workspace-id"]).toBe("workspace-a");
    expect(command.headers["x-tenant-id"]).toBe("tenant-a");
    expect(command.headers["x-csrf-token"]).toBeTruthy();
    expect(command.headers["x-idempotency-key"]).toBeTruthy();
    expect(command.headers.authorization).toBeUndefined();
  }
});

test("updates an existing draft and keeps the same resource and workspace", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context);
  await page.goto("/invoices/invoice-1/edit?workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("invoice-edit-mobile.png") });
  await page.getByTestId("invoice-line-description-0").fill("Updated scoped work");
  const main = page.locator("main#focused-content");
  expect(await main.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page).toHaveURL(/\/invoices\?workspaceId=workspace-a/);
  expect(fixture.commands).toHaveLength(1);
  expect(fixture.commands[0]).toMatchObject({
    path: "/api/bff/invoices/invoice-1",
    body: { lineItems: [{ description: "Updated scoped work", qty: 2, unitPriceCents: 15000 }] },
  });
});

test("renders loading and error states and recovers without showing empty data on failure", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context, { loading: true, fail: true });
  await page.goto("/invoices?workspaceId=workspace-a");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.screenshot({ path: testInfo.outputPath("invoice-loading-desktop.png") });
  fixture.releaseList();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("No invoices yet", { exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("invoice-error-desktop.png") });
  fixture.recover();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByTestId("invoice-row-invoice-1")).toBeVisible();
});

test("guards dirty forms and rejects unrelated routes and audit targets", async ({
  page,
  context,
}) => {
  const fixture = await invoiceTransport(context);
  await page.goto("/invoices/new?workspaceId=workspace-a");
  await page.getByTestId("invoice-line-description-0").fill("Unsaved original draft");
  await page.getByRole("link", { name: "Invoices", exact: true }).first().click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue(
    "Unsaved original draft"
  );
  await page.getByRole("link", { name: "Invoices", exact: true }).first().click();
  await page.getByRole("button", { name: "Leave page", exact: true }).click();
  for (const path of ["/hr", "/tasks", "/accounting"]) {
    await page.goto(`${path}?workspaceId=workspace-a`);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
  await page.goto("/audit?entity=employee&id=private&workspaceId=workspace-a");
  await expect(page.getByText("Unsupported audit target.")).toBeVisible();
  expect(fixture.requests.some((path) => /people|tasks|accounting|private/.test(path))).toBe(false);
});

test("shows empty, missing-record and denied-workspace states", async ({
  page,
  context,
}, testInfo) => {
  await invoiceTransport(context, { empty: true });
  await page.goto("/invoices?workspaceId=workspace-a");
  await expect(page.getByText("No invoices yet", { exact: true })).toBeVisible();
  await page.goto("/invoices/missing?workspaceId=workspace-a");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  await page.goto("/invoices?workspaceId=foreign");
  await expect(page.getByRole("alert")).toContainText("requested workspace is unavailable");
  await page.screenshot({ path: testInfo.outputPath("invoice-denied-desktop.png") });
});
