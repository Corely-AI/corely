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
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-pdf-owner-desktop.png"),
  });
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
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-list-desktop.png"),
  });
  await page.getByTestId("view-invoice-invoice-1").click();
  await expect(page).toHaveURL(/\/invoices\/invoice-1\?workspaceId=workspace-a/);
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.reload();
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.goto("/invoices/invoice-1/edit?workspaceId=workspace-a");
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue("Consulting package");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-detail-desktop.png"),
  });
  await page.goto("/audit?entity=invoice&id=invoice-1&workspaceId=workspace-a");
  await expect(page.getByText("Invoice created", { exact: true })).toBeVisible();
  expect(fixture.requests.some((path) => path.startsWith("/api/bff/audit"))).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-activity-mobile.png"),
  });
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
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-edit-mobile.png"),
  });
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
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-loading-desktop.png"),
  });
  fixture.releaseList();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("No invoices yet", { exact: true })).toBeHidden();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-error-desktop.png"),
  });
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
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-denied-desktop.png"),
  });
});

test("searches remote customers, paginates, and creates inline without CRM navigation", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context);
  await page.goto("/invoices/new?workspaceId=workspace-a");
  expect(fixture.requests.some((path) => path.includes("customers"))).toBe(false);
  await page.getByTestId("invoice-customer-select").click();
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.getByTestId("invoice-customer-option-customer-2")).toBeVisible();
  await page.getByRole("combobox").fill("Remote");
  const remote = page.getByTestId("invoice-customer-option-customer-remote");
  await expect(remote).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("customer-search-desktop.png"),
  });
  await page.getByRole("combobox").press("ArrowDown");
  await page.getByRole("combobox").press("Enter");
  await expect(page.getByTestId("invoice-customer-select")).toContainText("Remote Customer");
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  await page.getByTestId("customer-displayName-input").fill("New Synthetic Customer");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("invoice-customer-select")).toContainText("New Synthetic Customer");
  expect(fixture.commands).toHaveLength(1);
  expect(fixture.commands[0]).toMatchObject({
    path: "/api/bff/customers",
    headers: { "x-workspace-id": "workspace-a" },
  });
  expect(fixture.requests.some((path) => /people|accounting|ai-copilot/.test(path))).toBe(false);
});

test("distinguishes failed customer lookup from empty results and recovers errors", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context, { customerFail: true });
  await page.goto("/invoices/new?workspaceId=workspace-a");
  await page.getByTestId("invoice-customer-select").click();
  await expect(page.getByRole("alert")).toContainText("Customer lookup is unavailable");
  await expect(page.getByText("No customers found", { exact: true })).toBeHidden();
  await expect(page.getByTestId("invoice-customer-option-customer-1")).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => {
      const box = await page.getByRole("dialog").boundingBox();
      return box !== null && box.x >= 0 && box.x + box.width <= 391;
    })
    .toBe(true);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("customer-lookup-error-mobile.png"),
  });
  fixture.recover();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByTestId("invoice-customer-option-customer-1")).toBeVisible();
});

test("keeps assistant drafts scoped and reviewable without sending", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context, { issued: true });
  await page.goto("/invoices/invoice-1?workspaceId=workspace-a");
  await page.getByRole("button", { name: "Draft invoice email", exact: true }).click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("Invoice proposal");
  await page.getByLabel("Body", { exact: true }).fill("Reviewed proposal");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-assistant-review-desktop.png"),
  });
  await page.getByRole("button", { name: "Close", exact: true }).first().click();
  expect(fixture.commands.map((command) => command.path)).toEqual([
    "/api/bff/invoices/invoice-1/copilot/draft-issue-email",
  ]);
  expect(fixture.commands[0].headers).toMatchObject({
    "x-workspace-id": "workspace-a",
    "x-tenant-id": "tenant-a",
  });
  expect(fixture.requests.some((path) => /ai-copilot|\/documents/.test(path))).toBe(false);
});

test("preserves manual reviewed sending when AI is unavailable", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context, {
    issued: true,
    copilotFail: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/invoices/invoice-1?workspaceId=workspace-a");
  await page.getByRole("button", { name: "Draft invoice email", exact: true }).click();
  await expect(
    page.getByText("Service temporarily unavailable", { exact: true }).first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.locator("#to").fill("synthetic@example.invalid");
  await page.locator("#subject").fill("Manually reviewed invoice");
  await page.locator("#message").fill("Manual message");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Send Email", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Send Email", exact: true })
  ).toBeInViewport();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-manual-send-mobile.png"),
  });
  expect(fixture.commands).toHaveLength(1);
  await page.getByRole("dialog").getByRole("button", { name: "Send Email", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(fixture.commands.at(-1)).toMatchObject({
    path: "/api/bff/invoices/invoice-1/send",
    body: {
      to: "synthetic@example.invalid",
      subject: "Manually reviewed invoice",
      message: "Manual message",
      attachPdf: false,
    },
  });
});

test("creating a customer never submits an already-valid invoice", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context);
  await page.goto("/invoices/new?workspaceId=workspace-a");
  await page.getByTestId("invoice-customer-select").click();
  await page.getByTestId("invoice-customer-option-customer-1").click();
  await page.getByTestId("invoice-line-description-0").fill("Valid unsaved invoice");
  await page.getByTestId("invoice-line-rate-0").fill("100");
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  await page.getByTestId("customer-displayName-input").fill("New Synthetic Customer");
  await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("invoice-customer-select")).toContainText("New Synthetic Customer");
  await expect(page).toHaveURL(/\/invoices\/new\?workspaceId=workspace-a/);
  expect(fixture.commands.map((command) => command.path)).toEqual(["/api/bff/customers"]);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-customer-save-preserved-desktop.png"),
  });
});

test("list Email action requires recipient review before finalizing or sending", async ({
  page,
  context,
}, testInfo) => {
  const fixture = await invoiceTransport(context);
  await page.goto("/invoices?workspaceId=workspace-a");
  await page
    .getByTestId("invoice-row-invoice-1")
    .getByRole("button", { name: "Open actions" })
    .click();
  await page.getByRole("menuitem", { name: "Email", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Send Invoice" });
  await expect(dialog).toBeVisible();
  expect(fixture.commands).toHaveLength(0);
  await dialog.getByLabel("Recipient").fill("reviewed@example.invalid");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("invoice-list-email-review-desktop.png"),
  });
  await dialog.getByRole("button", { name: "Send Email", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(fixture.commands.map((command) => command.path)).toEqual([
    "/api/bff/invoices/invoice-1/finalize",
    "/api/bff/invoices/invoice-1/send",
  ]);
  expect(fixture.commands[1].body).toMatchObject({ to: "reviewed@example.invalid" });
});
