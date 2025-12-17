import { chromium, FullConfig } from "@playwright/test";
import { seedTestData } from "./testData";

async function globalSetup(_config: FullConfig) {
  // Seed test data and create a logged-in storage state
  const baseURL = process.env.BASE_URL || "http://localhost:5173";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the app
  await page.goto(baseURL);

  // Call seed endpoint to create test tenant/user
  const testData = await seedTestData();

  if (testData) {
    const loginUrl = `${baseURL}/auth/login`;
    await page.goto(loginUrl);

    await page.waitForSelector('input[data-testid="login-email"]', { timeout: 15000 });
    await page.fill('input[data-testid="login-email"]', testData.user.email);
    await page.fill('input[data-testid="login-password"]', testData.user.password);
    await page.click('button[data-testid="login-submit"]');

    await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {});

    await context.storageState({
      path: "utils/storageState.json",
    });
  }

  await context.close();
  await browser.close();
}

export default globalSetup;
