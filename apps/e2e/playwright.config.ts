import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const isPublicWeb = process.env.PUBLIC_WEB_E2E === "true";
const baseURL =
  process.env.BASE_URL || (isPublicWeb ? "http://localhost:8082" : "http://localhost:8080");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],

  webServer: [
    {
      command: isPublicWeb
        ? "pnpm --filter @corely/public-web dev --host 0.0.0.0 --port 8082"
        : "pnpm --filter @corely/web dev --host 0.0.0.0 --port 8080",
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @corely/portal dev --host 0.0.0.0 --port 8083",
      url: "http://localhost:8083",
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],

  globalSetup: "./utils/globalSetup.ts",
  timeout: 60_000,
});
