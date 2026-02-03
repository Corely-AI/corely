import { test, expect } from "@playwright/test";

const isPublicWeb = process.env.PUBLIC_WEB_E2E === "true";

test.skip(!isPublicWeb, "Public web smoke tests disabled.");

test("public web home renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make your workspace visible to the world." })
  ).toBeVisible();
});
