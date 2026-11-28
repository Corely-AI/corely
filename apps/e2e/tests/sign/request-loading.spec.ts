import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import type { SignRequestDraft } from "@corely/contracts";

const draft: SignRequestDraft = {
  requestId: "10000000-0000-4000-8000-000000000004",
  templateId: "10000000-0000-4000-8000-000000000003",
  templateRevision: 1,
  title: "Sample signing request",
  canonicalSha256: "a".repeat(64),
  routing: "parallel",
  recipients: [{ roleId: "signer", name: "Jamie Example", email: "jamie@example.test" }],
  status: "DRAFT",
};
const detailPath = "/sign/requests/" + draft.requestId;
const draftProgress = { status: "DRAFT", expiresAt: null, recipients: [] };
const sentProgress = {
  status: "SENT",
  expiresAt: "2030-01-01T23:59:59.000Z",
  recipients: [{ roleId: "signer", status: "INVITED", deliveredAt: null, acceptedAt: null }],
};
const entry = fileURLToPath(new URL("./browser-fixture.tsx", import.meta.url)).replaceAll(
  "\\",
  "/"
);

test.beforeEach(async ({ page }) => {
  await page.route("**/src/main.tsx*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "import " + JSON.stringify("/@fs/" + entry),
    })
  );
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 900, reduced: false },
  { name: "mobile", width: 390, height: 844, reduced: true },
]) {
  test(
    "loads request and progress without hiding ready details on " + viewport.name,
    async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: viewport.reduced ? "reduce" : "no-preference" });
      const detail = Promise.withResolvers<void>();
      const progress = Promise.withResolvers<void>();
      const refresh = Promise.withResolvers<void>();
      let progressRequests = 0;
      await page.route("**/api" + detailPath, async (route) => {
        await detail.promise;
        await route.fulfill({ json: draft });
      });
      await page.route("**/api" + detailPath + "/progress", async (route) => {
        const initial = ++progressRequests === 1;
        await (initial ? progress.promise : refresh.promise);
        await route.fulfill({ json: initial ? draftProgress : sentProgress });
      });

      await page.goto(detailPath);
      const loading = page.getByRole("status").filter({ hasText: "Loading request…" });
      const requestTitle = page.getByRole("heading", { name: draft.title });
      const reviewOriginal = page.getByRole("button", { name: "Review original PDF" });
      const refreshButton = page.getByRole("button", { name: "Refresh status" });
      const sendButton = page.getByRole("button", { name: "Review and send invitations" });

      await expect(loading).toHaveCount(1);
      await expect(requestTitle).toHaveCount(0);
      await expect(loading.locator("..").locator(".animate-pulse").first()).toHaveCSS(
        "animation-name",
        viewport.reduced ? "none" : "pulse"
      );
      await page.screenshot({
        path: testInfo.outputPath("request-loading.png"),
        animations: "disabled",
      });
      detail.resolve();

      await expect(requestTitle).toBeVisible();
      await expect(page.getByText("jamie@example.test", { exact: true })).toBeVisible();
      await expect(loading).toHaveCount(1);
      await expect(sendButton).toHaveCount(0);
      await expect(refreshButton).toBeDisabled();
      await page.keyboard.press("Tab");
      await expect(reviewOriginal).toBeFocused();
      await page.screenshot({
        path: testInfo.outputPath("progress-loading.png"),
        animations: "disabled",
      });
      progress.resolve();

      await expect(loading).toHaveCount(0);
      await expect(sendButton).toBeVisible();
      await refreshButton.click();
      await expect(refreshButton).toBeDisabled();
      await expect(refreshButton).toBeFocused();
      await expect(sendButton).toBeVisible();
      await expect(loading).toHaveCount(0);
      refresh.resolve();
      await expect(page.getByText("Status · Waiting for signatures")).toBeVisible();
      await expect(refreshButton).toBeEnabled();
    }
  );
}

test("replaces failed loading states with usable retry controls", async ({ page }) => {
  const detailRetry = Promise.withResolvers<void>();
  const progressRetry = Promise.withResolvers<void>();
  let detailAttempts = 0;
  let progressAttempts = 0;
  const failure = { status: 404, json: { title: "Request not found", status: 404 } };
  await page.route("**/api" + detailPath, async (route) => {
    if (++detailAttempts === 1) {
      await route.fulfill(failure);
      return;
    }
    await detailRetry.promise;
    await route.fulfill({ json: draft });
  });
  await page.route("**/api" + detailPath + "/progress", async (route) => {
    if (++progressAttempts === 1) {
      await route.fulfill(failure);
      return;
    }
    await progressRetry.promise;
    await route.fulfill({ json: sentProgress });
  });

  await page.goto(detailPath);
  const alert = page.getByRole("alert");
  const loading = page.getByRole("status").filter({ hasText: "Loading request…" });
  await expect(alert).toBeVisible();
  await expect(loading).toHaveCount(0);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(loading).toHaveCount(1);
  detailRetry.resolve();

  await expect(page.getByRole("heading", { name: draft.title })).toBeVisible();
  await expect(alert).toBeVisible();
  await expect(loading).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh status" }).click();
  await expect(loading).toHaveCount(1);
  progressRetry.resolve();
  await expect(page.getByText("Status · Waiting for signatures")).toBeVisible();
  await expect(loading).toHaveCount(0);
  await expect(alert).toHaveCount(0);
});
