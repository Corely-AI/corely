import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";

test.describe("Authentication", () => {
  test("should login and display user in menu", async ({ page, testData }) => {
    await page.goto("/auth/login");

    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    const userMenuButton = await page.locator(selectors.auth.userMenuButton);
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    const userMenu = await page.locator(selectors.auth.userMenu);
    await expect(userMenu).toContainText(testData.user.email);
  });

  test("should display tenant name in navigation", async ({ page, testData }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator(selectors.navigation.sidebarNav);
    await expect(sidebar).toBeVisible();

    const pageContent = await page.content();
    expect(pageContent).toContain(testData.tenant.name);
  });

  test("should redirect to login when accessing protected page", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");

    await page.waitForURL("**/auth/login", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
