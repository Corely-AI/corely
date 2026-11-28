import { test, expect } from "@playwright/test";
import { invoiceTransport } from "../focused-invoice/invoice-fixture";

for (const state of ["empty", "denied", "missing"] as const) {
  test(`Invoice ${state} state has a reachable recovery`, async ({ page, context }, info) => {
    await context.addInitScript(
      (locale) => localStorage.setItem("Corely One ERP-language", locale),
      info.project.name
    );
    await invoiceTransport(context, state === "empty" ? { empty: true } : {});
    const path = state === "missing" ? "/invoices/missing" : "/invoices";
    await page.goto(
      `http://127.0.0.1:5188${path}?workspaceId=${state === "denied" ? "foreign" : "workspace-a"}`
    );
    if (state === "denied") {
      await expect(page.getByRole("alert")).toBeVisible();
    } else if (state === "missing") {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("button")).not.toHaveCount(0);
    } else {
      await expect(page.locator("tbody tr")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.screenshot({
      animations: "disabled",
      path: info.outputPath(`invoice-${state}-${info.project.name}.png`),
    });
  });
}

test("loading/error recovery and dirty-form keyboard decisions", async ({
  page,
  context,
}, info) => {
  await context.addInitScript(
    (locale) => localStorage.setItem("Corely One ERP-language", locale),
    info.project.name
  );
  const fixture = await invoiceTransport(context, { loading: true, fail: true });
  await page.goto("http://127.0.0.1:5188/invoices?workspaceId=workspace-a");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath(`invoice-loading-${info.project.name}.png`),
  });
  fixture.releaseList();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath(`invoice-error-${info.project.name}.png`),
  });
  fixture.recover();
  await page.locator("main").getByRole("alert").getByRole("button").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("invoice-row-invoice-1")).toBeVisible();
  await page.goto("http://127.0.0.1:5188/invoices/new?workspaceId=workspace-a");
  await page.getByTestId("invoice-line-description-0").fill("Unsaved synthetic draft");
  const link = page.locator('aside a[href="/invoices?workspaceId=workspace-a"]');
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: info.outputPath(`invoice-dirty-${info.project.name}.png`),
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(page.getByTestId("invoice-line-description-0")).toHaveValue(
    "Unsaved synthetic draft"
  );
});
