import { test, expect } from "@playwright/test";

const isPublicWeb = process.env.PUBLIC_WEB_E2E === "true";
const bookingSlug = process.env.PUBLIC_BOOKING_SLUG;

test.skip(!isPublicWeb, "Public web smoke tests disabled.");
test.skip(!bookingSlug, "Set PUBLIC_BOOKING_SLUG to run public booking smoke test.");

test("public booking flow smoke", async ({ page }) => {
  await page.goto(`/book/${bookingSlug}`);

  await expect(page.getByRole("heading", { name: /Book Online/i })).toBeVisible();

  const serviceButtons = page.locator('[data-testid^="booking-service-select-"]');
  await expect(serviceButtons.first()).toBeVisible();
  await serviceButtons.first().click();

  const slotButtons = page.locator('[data-testid^="booking-slot-"]');
  await expect(slotButtons.first()).toBeVisible({ timeout: 15_000 });
  await slotButtons.first().click();

  await page.getByTestId("booking-continue").click();

  await expect(page.getByRole("heading", { name: /Confirm your appointment/i })).toBeVisible();

  await page.getByLabel("First name").fill("Smoke");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Email").fill("smoke.tester@example.com");
  await page.getByLabel(/I agree to the cancellation policy/i).check();

  await page.getByTestId("booking-confirm").click();

  await expect(page).toHaveURL(/\/book\/.*\/success\//, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Your booking is confirmed/i })).toBeVisible();
  await expect(page.getByText(/Booking ID:/i)).toBeVisible();
});
