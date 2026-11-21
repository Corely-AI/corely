import { test, expect } from "@playwright/test";
test("sign the database-backed request in the public client", async ({ page }, info) => {
  const token = process.env.SIGN_FIXTURE_INVITATION;
  if (!token || !process.env.PUBLIC_API_BASE_URL?.startsWith("http://127.0.0.1:")) {
    throw Error("Start through the Sign PostgreSQL browser fixture");
  }
  await page.goto("/sign/receive#" + token);
  await page.getByRole("button", { name: "Open document for review" }).click();
  await expect(page.getByText("Page 1 of 1")).toBeVisible({ timeout: 45000 });
  await page.getByRole("textbox", { name: "signature", exact: true }).fill("Taylor Sample");
  await page.getByRole("button", { name: "Save progress" }).click();
  await expect(page.getByText("Progress saved.")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Review answers" }).click();
  await page.screenshot({ path: info.outputPath("recipient-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Sign and submit" }).click();
  await expect(page.getByText("Your signature has been recorded.")).toBeVisible();
});
