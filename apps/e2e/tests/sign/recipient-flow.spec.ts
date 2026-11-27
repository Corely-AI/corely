import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

for (const [language, locale, open, unavailable] of [
  [
    "de-DE",
    "de",
    "Dokument zur Prüfung öffnen",
    "Dieser Link oder diese Sitzung ist nicht verfügbar.",
  ],
  ["vi-VN", "vi", "Mở tài liệu để xem", "Liên kết hoặc phiên ký không còn hiệu lực."],
  ["ja-JP", "en", "Open document for review", "This signing link or session is unavailable."],
] as const) {
  test.describe(`recipient using ${language}`, () => {
    test.use({ locale: language });
    test("localizes the review action and session error", async ({ page }) => {
      await page.route("**/api/signing/review", (route) => route.fulfill({ status: 403 }));
      await page.goto("/sign/receive");
      const form = page.getByRole("main");
      await expect(form).toHaveAttribute("lang", locale);
      await form.getByRole("button", { name: open }).click();
      await expect(form.getByRole("alert")).toHaveText(unavailable);
    });
  });
}

test("explicit review, consent, saved progress and mobile acceptance", async ({ page }, info) => {
  const pdf = (await readFile(new URL("./sample-agreement.pdf", import.meta.url))).toString(
    "base64"
  );
  const calls: string[] = [];
  await page.route("**/api/signing/*", async (route) => {
    const action = new URL(route.request().url()).pathname.split("/").pop()!;
    if (action === "pdf-module" || action === "pdf-worker") return route.continue();
    calls.push(action);
    expect(route.request().headers()["x-sign-action"]).toBe("1");
    if (action === "review") {
      await route.fulfill({
        json: {
          title: "Sample consulting agreement",
          role: "client",
          fields: [
            {
              id: "sig",
              roleId: "client",
              documentId: "original",
              rect: { x: 0.1, y: 0.4, width: 0.25, height: 0.1 },
              type: "signature",
              pageIndex: 0,
              required: true,
            },
          ],
          saved: [],
          consent: "I intend to sign this test agreement.",
          pdf,
          review: "f".repeat(64),
        },
      });
      return;
    }
    if (action === "prepare") {
      await route.fulfill({ json: { confirmation: "c".repeat(64), pdf } });
      return;
    }
    if (action === "accept")
      expect(route.request().postDataJSON()).toEqual({
        confirmation: "c".repeat(64),
        consent: true,
        review: "f".repeat(64),
        values: [{ fieldId: "sig", value: "Taylor Sample" }],
      });
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/sign/receive#" + "x".repeat(43));
  await expect(page).toHaveURL(/\/sign\/receive$/);
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: "Open document for review" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.getByRole("textbox", { name: "signature", exact: true }).fill("Taylor Sample");
  await page.getByRole("button", { name: "Save progress" }).click();
  await expect(page.getByText("Progress saved.")).toBeVisible();
  await page.getByRole("button", { name: "Review answers" }).click();
  expect(calls).not.toContain("accept");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Review answers" }).click();
  await page.getByRole("heading", { name: "Confirm your signature" }).scrollIntoViewIfNeeded();
  await expect(page.getByText("Page 1 of 2")).toBeVisible({ timeout: 45000 });
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate(
          (canvas: HTMLCanvasElement) => canvas.getContext("2d")?.getImageData(0, 0, 1, 1).data[3]
        )
    )
    .toBe(255);
  await page.screenshot({ path: info.outputPath("recipient-mobile.png"), fullPage: true });
  if (process.env.SIGN_E2E_RECIPIENT_SURFACE === "backoffice") {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: info.outputPath("recipient-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.getByRole("button", { name: "Sign and submit" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your signature has been recorded." })
  ).toBeVisible();
  expect(calls).toEqual(["exchange", "review", "progress", "prepare", "accept"]);
});

if (process.env.SIGN_E2E_RECIPIENT_SURFACE === "backoffice") {
  test("requires sign-in for the Backoffice signing request page", async ({ page }) => {
    await page.goto("/sign/requests/10000000-0000-4000-8000-000000000001");
    await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/, { timeout: 20000 });
  });
}
