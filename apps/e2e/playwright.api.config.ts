import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const baseURL = process.env.API_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/api-results.json" }],
    ["junit", { outputFile: "test-results/api-junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "api-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./utils/globalSetup.ts",
  timeout: 90_000,
});
