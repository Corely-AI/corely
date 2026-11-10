import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/focused-hr",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  outputDir: "test-results/focused-hr",
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: "http://127.0.0.1:5189",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec vite --config ../hr/vite.config.ts --port 5189",
    url: "http://127.0.0.1:5189",
    reuseExistingServer: false,
    timeout: 30_000,
    env: { VITE_CORELY_APP_CENTER_ORIGIN: "http://app.localhost:5189" },
  },
});
