import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";

test.describe("Authentication", () => {
  test("should login and display user in menu", async ({ page, testData }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth/login");

    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });

    const userMenuButton = page.locator(selectors.auth.userMenuButton).first();
    await expect(userMenuButton).toBeVisible();
    await userMenuButton.click();

    const userMenu = page.locator(selectors.auth.userMenu).first();
    await expect(userMenu).toContainText(testData.user.email);
  });

  test("should display tenant name in navigation", async ({ page, testData }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/auth/login");

    await page.fill(selectors.auth.loginEmailInput, testData.user.email);
    await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
    await page.click(selectors.auth.loginSubmitButton);

    await page.waitForURL("**/dashboard", { timeout: 10_000 });
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

  test("should signup and create workspace", async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // Navigate to signup page
    await page.goto("/auth/signup");

    // Generate unique test credentials
    const timestamp = Date.now();
    const testEmail = `e2e-signup-${timestamp}@corely.local`;
    const testPassword = "SignupTest123!";
    const testTenant = `E2E Test Tenant ${timestamp}`;

    // Fill signup form
    await page.fill(selectors.auth.signupEmailInput, testEmail);
    await page.fill(selectors.auth.signupPasswordInput, testPassword);
    const tenantInput = page.locator(selectors.auth.signupTenantInput);
    if (await tenantInput.count()) {
      await tenantInput.fill(testTenant);
    }

    // Submit signup form
    await page.click(selectors.auth.signupSubmitButton);

    // Wait for redirect to onboarding or dashboard
    await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 10_000 });

    if (page.url().includes("/onboarding")) {
      await page.fill(selectors.workspace.onboardingName, "E2E Workspace");
      await page.click(selectors.workspace.onboardingNext);
      await page.fill(selectors.workspace.onboardingLegalName, "E2E Legal");
      await page.fill(selectors.workspace.onboardingAddress, "123 Main St");
      await page.fill(selectors.workspace.onboardingCity, "Berlin");
      await page.fill(selectors.workspace.onboardingPostal, "10115");
      await page.click(selectors.workspace.onboardingNext);
      await page.click(selectors.workspace.onboardingSubmit);
      await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
    }

    // Verify user is authenticated by checking for user menu
    const userMenuButton = page.locator(selectors.auth.userMenuButton).first();
    await expect(userMenuButton).toBeVisible({ timeout: 10_000 });
  });
});
