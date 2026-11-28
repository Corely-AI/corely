import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";

test("sign-in returns to cash billing with the checkout result", async ({ page, testData }) => {
  await page.goto("/cash/billing?checkout=cancelled");
  await page.getByTestId("login-email").fill(testData.user.email);
  await page.getByTestId("login-password").fill(testData.user.password);
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/cash\/billing\?checkout=cancelled$/);
  await expect(page.getByRole("heading", { name: "Plans and billing" })).toBeVisible();
});
