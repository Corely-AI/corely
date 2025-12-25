import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(_config: FullConfig) {
  // Global setup for test infrastructure
  // Note: Each test creates its own isolated test data via fixtures
  // and handles authentication independently for better test isolation

  // Verify API is reachable
  const baseURL = process.env.BASE_URL || "http://localhost:5173";
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(baseURL, { timeout: 15000 });
  } catch (error) {
    console.error("Failed to reach application at", baseURL);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
