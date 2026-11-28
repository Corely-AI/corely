import { writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import {
  authenticate,
  publicBookingTransport,
  requestId,
  requestTransport,
  taskTitle,
  taskTransport,
  time,
} from "./pilot-transport";

async function scan(page: Page, region: string, testInfo: TestInfo, state: string) {
  const report = await new AxeBuilder({ page }).include(region).analyze();
  const findings = report.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    selectors: nodes.map(({ target }) => target),
  }));
  const manualReview = report.incomplete.map(({ id, nodes }) => ({
    id,
    selectors: nodes.map(({ target }) => target),
  }));
  const path = testInfo.outputPath(state + "-axe.json");
  await writeFile(
    path,
    JSON.stringify({ passes: report.passes.length, manualReview, findings }, null, 2)
  );
  await testInfo.attach(state + "-axe.json", { contentType: "application/json", path });
  expect.soft(findings, state + " accessibility scan").toEqual([]);
}

async function enter(control: Locator, page: Page) {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press("Enter");
}

test("DE studio task board offer keyboard retry, navigation and task completion", async ({
  page,
  context,
}, testInfo) => {
  await authenticate(context, "de");
  const taskApi = await taskTransport(context, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/openbuk/app/tasks?lang=de");
  const main = page.locator("#studio-main");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(main.getByText("Aufgaben konnten nicht geladen werden.")).toBeVisible();
  taskApi.recover();
  await enter(main.getByRole("button", { name: "Erneut versuchen" }), page);
  await expect(main.getByRole("heading", { name: "Tagesarbeit" })).toBeVisible();
  const skip = page.locator('a[href="#studio-main"]');
  await enter(skip, page);
  await expect(main).toBeFocused();
  await enter(main.getByRole("button", { name: "Board", exact: true }), page);
  const task = main.getByRole("article", { name: taskTitle });
  await expect(task).toBeVisible();
  await expect(main.getByText(/Europe\/Berlin/)).toBeVisible();
  await scan(page, "#studio-main", testInfo, "de-task-board");
  await enter(task.getByRole("button", { name: "Erledigen", exact: true }), page);
  await expect(task.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("de-mobile-task-board.png"),
    animations: "disabled",
    fullPage: true,
  });
});

test("VI reviewer validates a return and can exit the confirmation with keyboard focus intact", async ({
  page,
  context,
}, testInfo) => {
  await authenticate(context, "vi");
  const writes = await requestTransport(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/requests/${requestId}?lang=vi`);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  const returnButton = page.getByRole("button", { name: "Trả lại để bổ sung", exact: true });
  await enter(returnButton, page);
  await expect(page.getByRole("alert")).toContainText("Nhập tin nhắn");
  await page.getByLabel("Tin nhắn cho người gửi yêu cầu").fill("Thông tin tổng hợp");
  await enter(returnButton, page);
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/chỉnh sửa và gửi lại/);
  const bounds = await dialog.boundingBox();
  expect(bounds?.width).toBeLessThanOrEqual(390);
  expect(bounds?.height).toBeLessThanOrEqual(844);
  expect(bounds?.x).toBeGreaterThanOrEqual(8);
  expect((bounds?.x ?? 390) + (bounds?.width ?? 390)).toBeLessThanOrEqual(382);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await scan(page, '[role="alertdialog"]', testInfo, "vi-review-dialog");
  await page.screenshot({
    path: testInfo.outputPath("vi-mobile-review-dialog.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(returnButton).toBeFocused();
  expect(writes).toHaveLength(0);
});

for (const locale of ["en", "de", "vi"] as const) {
  test(`${locale.toUpperCase()} public booking shows local currency, time and a keyboard-selectable slot`, async ({
    context,
    page,
  }, testInfo) => {
    await publicBookingTransport(context);
    await page.clock.setFixedTime(new Date("2026-11-28T08:00:00.000Z"));
    if (locale !== "en") {
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.goto(`/openbuk/book/linden-studio?lang=${locale}`);
    const main = page.getByRole("main");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const expectedPrice = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
    }).format(35);
    const expectedTime = new Intl.DateTimeFormat(locale, {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time));
    await expect(main.getByText(expectedPrice, { exact: true })).toBeVisible();
    await expect(main.getByLabel(/Europe\/Berlin/)).toHaveValue("2026-11-28");
    const slot = main.getByRole("button", { name: new RegExp(expectedTime) });
    await enter(slot, page);
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    const customerName = main.locator("input[name='name']");
    await expect(customerName).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(customerName).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await scan(page, "main", testInfo, `${locale}-public-booking`);
    if (locale !== "de") {
      await page.screenshot({
        path: testInfo.outputPath(`${locale}-public-booking.png`),
        animations: "disabled",
        fullPage: true,
      });
    }
  });
}
