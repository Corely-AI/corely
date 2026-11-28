import { expect, test } from "@playwright/test";

const acmeSlug = process.env.OPENBUK_UPGRADE_ACME_SLUG;
const defaultSlug = process.env.OPENBUK_UPGRADE_DEFAULT_SLUG;
const earlyDay = process.env.OPENBUK_UPGRADE_EARLY_DAY;
const acceptedDay = process.env.OPENBUK_UPGRADE_ACCEPTED_DAY;
const instructions = "Please arrive 10 minutes early and check in at reception.";

test.describe("Booking release confirmation customization", () => {
  test.skip(
    !acmeSlug || !defaultSlug || !earlyDay || !acceptedDay,
    "Requires two provisioned studios on the disposable Booking upgrade installation"
  );

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    for (const customized of [true, false]) {
      test(`${customized ? "Acme" : "Default"} confirmation at ${viewport.width}px`, async ({
        page,
        baseURL,
      }, info) => {
        expect(["127.0.0.1", "localhost"]).toContain(new URL(baseURL!).hostname);
        await page.setViewportSize(viewport);
        const slug = customized ? acmeSlug : defaultSlug;
        await page.addInitScript(() => localStorage.setItem("openbuk:locale", "en"));
        await page.goto(`/openbuk/book/${encodeURIComponent(slug!)}`);

        await expect(page.getByRole("heading", { name: "Booking Upgrade Service" })).toBeVisible();
        const date = page.locator('input[type="date"]');
        const submit = async (day: string, pick: "first" | "last") => {
          const available = page.waitForResponse(
            (response) => response.url().includes(`/availability?day=${day}`) && response.ok()
          );
          await date.fill(day);
          await available;
          const slots = page.locator(".slot-grid button");
          await slots[pick]().click();
          await page.getByLabel("Full name", { exact: true }).fill("Booking Upgrade Guest");
          await page.getByLabel("Email", { exact: true }).fill("guest@example.test");
          await page.locator('input[name="consentAccepted"]').check();
          const request = page.waitForResponse(
            (response) =>
              response.url().endsWith("/public/openbuk/bookings") &&
              response.request().method() === "POST"
          );
          await page.getByRole("button", { name: "Confirm booking" }).click();
          return request;
        };

        if (customized) {
          expect((await submit(earlyDay!, "first")).status()).toBe(400);
          await expect(page.getByRole("alert")).toContainText("at least 48 hours ahead");
          await expect(page.getByText(instructions, { exact: true })).toHaveCount(0);
        }
        expect((await submit(acceptedDay!, viewport.width > 400 ? "first" : "last")).status()).toBe(
          201
        );
        await expect(page.getByRole("heading", { name: "You’re booked in." })).toBeVisible();
        await expect(page.getByText("Booking reference", { exact: true })).toBeVisible();
        const footer = page.getByText(instructions, { exact: true });
        if (customized) {
          await expect(footer).toBeVisible();
          const bounds = await footer.boundingBox();
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
        } else {
          await expect(footer).toHaveCount(0);
        }
        await page.screenshot({ path: info.outputPath("confirmation.png"), fullPage: true });
      });
    }
  }
});
