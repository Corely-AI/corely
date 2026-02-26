import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const port = Number(process.env.POS_E2E_PORT ?? 18084);
const baseURL = process.env.POS_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/pos",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/pos-results.json" }],
    ["junit", { outputFile: "test-results/pos-junit.xml" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "pos-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm --filter @corely/pos web --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  globalSetup: "./utils/globalSetup.ts",
  timeout: 90_000,
});
