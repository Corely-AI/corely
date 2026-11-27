import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function sampleReview() {
  const pdf = (await readFile(new URL("./sample-agreement.pdf", import.meta.url))).toString(
    "base64"
  );
  return {
    title: "Sample consulting agreement",
    senderWorkspace: "Example Studio",
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
  };
}

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
  await page.emulateMedia({ reducedMotion: "reduce" });
  const review = await sampleReview();
  const calls: string[] = [];
  const reviewGate = Promise.withResolvers<void>();
  const pdfGate = Promise.withResolvers<void>();
  const previewGate = Promise.withResolvers<void>();
  await page.route(
    (url) =>
      url.pathname.endsWith("/api/signing/pdf-worker") ||
      (url.pathname.endsWith("/pdf.worker.min.mjs") && !url.searchParams.has("url")),
    async (route) => {
      await pdfGate.promise;
      await route.continue();
    }
  );
  await page.route("**/api/signing/*", async (route) => {
    const action = new URL(route.request().url()).pathname.split("/").pop()!;
    if (action === "pdf-module" || action === "pdf-worker") {
      return route.fallback();
    }
    calls.push(action);
    expect(route.request().headers()["x-sign-action"]).toBe("1");
    if (action === "review") {
      await reviewGate.promise;
      await route.fulfill({ json: review });
      return;
    }
    if (action === "prepare") {
      await previewGate.promise;
      await route.fulfill({ json: { confirmation: "c".repeat(64), pdf: review.pdf } });
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
  const opening = page.getByRole("status").filter({ hasText: "Opening invitation…" });
  await expect(opening).toHaveCount(1);
  await expect(opening.locator("..").locator(".animate-pulse").first()).toHaveCSS(
    "animation-name",
    "none"
  );
  await page.screenshot({
    path: info.outputPath("invitation-loading.png"),
    animations: "disabled",
  });
  reviewGate.resolve();

  const documentLoading = page.getByRole("status").filter({ hasText: /Loading (document|page)…/ });
  await expect(documentLoading).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Open original PDF" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("pdf-loading.png"), animations: "disabled" });
  pdfGate.resolve();
  await expect(documentLoading).toHaveCount(0, { timeout: 45000 });
  const title = page.getByRole("heading", { name: "Sample consulting agreement" });
  await expect(title).toBeFocused();
  await page.getByRole("button", { name: "Go to signing fields" }).click();
  await expect(page.getByRole("heading", { name: "Signing fields" })).toBeFocused();
  await expect(page.getByText("Page 1 of 2")).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Previous page" }).click();
  await page.getByRole("button", { name: "Go to field · signature" }).click();
  const signature = page.getByRole("textbox", { name: "signature", exact: true });
  await expect(signature).toBeFocused();
  await signature.fill("Taylor Sample");
  await page.getByRole("button", { name: "Save progress" }).click();
  await expect(page.getByText("Progress saved.")).toBeVisible();
  await signature.fill("Taylor Example");
  await expect(page.getByText("Progress saved.")).toHaveCount(0);
  await signature.fill("Taylor Sample");
  await page.getByRole("button", { name: "Review answers" }).click();
  expect(calls).not.toContain("accept");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Review answers" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Preparing your signed preview…" })
  ).toHaveCount(1);
  previewGate.resolve();
  const confirm = page.getByRole("heading", { name: "Confirm your signature" });
  await expect(confirm).toBeFocused();
  await expect(signature).toHaveCount(0);
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
    const document = await page.getByRole("region", { name: "Document preview" }).boundingBox();
    const answers = await page.getByRole("region", { name: "Your answers" }).boundingBox();
    expect(document?.x).toBeLessThan(answers?.x ?? 0);
    await page.screenshot({ path: info.outputPath("recipient-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.getByRole("button", { name: "Sign and submit" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your signature has been recorded." })
  ).toBeVisible();
  expect(calls).toEqual(["exchange", "review", "progress", "prepare", "accept"]);
});

test("offers preview recovery and an explicit in-app decline confirmation", async ({ page }) => {
  const review = await sampleReview();
  let declineCalls = 0;
  let blockPreview = true;
  await page.route(
    (url) =>
      url.pathname.endsWith("/api/signing/pdf-module") ||
      (url.pathname.endsWith("/pdf.mjs") && !url.searchParams.has("url")),
    (route) => (blockPreview ? route.abort() : route.continue())
  );
  await page.route("**/api/signing/review", (route) => route.fulfill({ json: review }));
  await page.route("**/api/signing/decline", (route) => {
    declineCalls++;
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/sign/receive");
  await page.getByRole("button", { name: "Open document for review" }).click();
  const preview = page.getByRole("region", { name: "Document preview" });
  await expect(preview.getByRole("alert")).toHaveText(
    "Could not display the preview. Try again or open the PDF."
  );
  await expect(page.getByRole("link", { name: "Open original PDF" })).toBeVisible();
  blockPreview = false;
  await page.getByRole("button", { name: "Retry preview" }).click();
  await expect(page.getByRole("button", { name: "Go to field · signature" })).toBeVisible({
    timeout: 45000,
  });
  const decline = page.getByRole("button", { name: "Decline request", exact: true });
  await decline.click();
  const dialog = page.getByRole("alertdialog", { name: "Decline this signing request?" });
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(decline).toBeFocused();
  expect(declineCalls).toBe(0);
  await decline.click();
  await dialog.getByRole("button", { name: "Decline request" }).click();
  await expect(page.getByRole("heading", { name: "You declined this request." })).toBeFocused();
  expect(declineCalls).toBe(1);
});

if (process.env.SIGN_E2E_RECIPIENT_SURFACE === "backoffice") {
  test("shows a skeleton before the public signing entry finishes loading", async ({ page }) => {
    const gate = Promise.withResolvers<void>();
    await page.route("**/src/modules/sign-recipient/main.tsx*", async (route) => {
      await gate.promise;
      await route.continue();
    });
    await page.goto("/sign/receive", { waitUntil: "commit" });
    await expect(page.getByRole("status")).toHaveText("Loading signing page…");
    gate.resolve();
    await expect(page.getByRole("button", { name: "Open document for review" })).toBeVisible();
  });
  test("requires sign-in for the Backoffice signing request page", async ({ page }) => {
    await page.goto("/sign/requests/10000000-0000-4000-8000-000000000001");
    await expect(page).toHaveURL(/\/auth\/login(?:\?|$)/, { timeout: 20000 });
  });
}
