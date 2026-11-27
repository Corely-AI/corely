import { expect, test } from "@playwright/test";
import type { ExpenseReceiptDraft, ExpenseReceiptDraftFields } from "@corely/contracts";
import { legacyInvoiceTransport } from "./legacy-invoice-fixture";

test("enables receipt forwarding and reviews and submits an emailed expense", async ({
  context,
  page,
}, info) => {
  await legacyInvoiceTransport(context);
  await context.route("**/api/platform/dimensions/types?*", (route) => route.fulfill({ json: [] }));
  await context.route("**/api/platform/custom-fields/indexed?*", (route) =>
    route.fulfill({ json: [] })
  );
  const address = "workspacexyz@expense.corely.one";
  const personalAddress = "workspace-a+synthetic@example.invalid";
  let enabled = false;
  let registered = false;
  const receipt: ExpenseReceiptDraft = {
    id: "email-receipt-example",
    filename: "parking.pdf",
    receivedAt: "2026-11-27T09:00:00.000Z",
    claimantUserId: null,
    submittedExpenseId: null,
    merchant: null,
    expenseDate: null,
    amountCents: null,
    currency: null,
    category: null,
  };
  const second = { ...receipt, id: "email-receipt-second", filename: "supplies.png" };

  await context.route("**/api/workspaces/workspace-a/members", (route) =>
    route.fulfill({
      json: { members: [{ userId: "user-a", name: "Alex Example", status: "ACTIVE" }] },
    })
  );
  await context.route("**/expense-receipts-fixture", (route) =>
    route.fulfill({ body: "Synthetic original receipt", contentType: "text/plain" })
  );
  await context.route("**/api/expense-receipts**", async (route) => {
    const request = route.request();
    expect(await request.headerValue("x-workspace-id")).toBe("workspace-a");
    const url = new URL(request.url());
    if (url.pathname.includes("/settings")) {
      if (request.method() === "PATCH") {
        enabled = request.postDataJSON().enabled;
      }
      if (url.pathname.endsWith("personal-address")) {
        registered = true;
      }
      return route.fulfill({
        json: {
          enabled,
          address,
          available: true,
          canManage: true,
          canForward: true,
          personalAddress: registered ? personalAddress : null,
        },
      });
    }
    if (url.pathname === "/api/expense-receipts") {
      return route.fulfill({
        json: { canReview: true, items: [receipt, second], nextCursor: null },
      });
    }
    if (url.pathname.endsWith("/original")) {
      return route.fulfill({ json: { url: `${url.origin}/expense-receipts-fixture` } });
    }
    if (url.pathname.endsWith("/assignment")) {
      expect(request.postDataJSON().userId).toBe("user-a");
      receipt.claimantUserId = "user-a";
    } else if (request.method() === "PATCH") {
      const { submit, ...fields }: ExpenseReceiptDraftFields & { submit: boolean } =
        request.postDataJSON();
      Object.assign(receipt, fields);
      if (submit) {
        expect(fields).toEqual({
          merchant: "Parking Garage",
          expenseDate: "2026-11-27",
          amountCents: 1250,
          currency: "EUR",
          category: "travel",
        });
        receipt.submittedExpenseId = receipt.id;
      }
    }
    return route.fulfill({ json: receipt });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings/workspace?workspaceId=workspace-a");
  const toggle = page.getByRole("switch", { name: "Enable receipt forwarding" });
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(page.getByLabel("Workspace forwarding address")).toHaveValue(address);
  await page.getByRole("button", { name: "Get my personal address" }).click();
  await expect(page.getByLabel("Personal forwarding address")).toHaveValue(personalAddress);
  await page.screenshot({ path: info.outputPath("receipt-email-settings.png") });

  await page.goto("/expenses?workspaceId=workspace-a");
  await page.getByRole("link", { name: "Emailed receipts" }).click();
  await expect(page.getByRole("button", { name: /supplies.png/ })).toBeVisible();
  await page.getByRole("button", { name: /parking.pdf/ }).click();
  await expect(page.getByText("Needs assignment").first()).toBeVisible();
  await page.getByLabel("Assign receipt to").selectOption("user-a");
  await page.getByRole("button", { name: "Assign receipt", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit expense" })).toBeDisabled();

  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open original" }).click();
  const original = await popup;
  await expect(original.getByText("Synthetic original receipt")).toBeVisible();
  await original.close();

  await page.locator("#receipt-merchant").fill("Parking Garage");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.locator("#receipt-date").fill("2026-11-27");
  await page.locator("#receipt-amount").fill("12.50");
  await page.getByLabel("Currency", { exact: true }).fill("EUR");
  await page.locator("#receipt-category").selectOption("travel");
  await expect(page.getByRole("button", { name: "Submit expense" })).toBeEnabled();
  await page.screenshot({ path: info.outputPath("receipt-review.png") });
  await page.getByRole("button", { name: "Submit expense" }).click();
  await expect(page.getByRole("link", { name: "View expense" })).toHaveAttribute(
    "href",
    `/expenses/${receipt.id}`
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "View expense" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("receipt-submitted-phone.png") });
});
