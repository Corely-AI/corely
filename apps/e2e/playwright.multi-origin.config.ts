import { defineConfig, devices } from "@playwright/test";
// Supported by the pinned Playwright build; avoids persisted failure snapshots containing proofs.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
export default defineConfig({
  testDir: "./tests/multi-origin",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/multi-origin/setup.mjs",
  reporter: [["./tests/multi-origin/sanitized-reporter.mjs"]],
  outputDir: "test-results/multi-origin",
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 45000,
  use: {
    proxy: { server: "http://127.0.0.1:8445" },
    locale: "en-US",
    ignoreHTTPSErrors: true,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
