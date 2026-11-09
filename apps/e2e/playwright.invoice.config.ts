import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/focused-invoice",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  outputDir: "test-results/focused-invoice",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5188",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec vite --config ../invoice/vite.config.ts --port 5188",
    url: "http://127.0.0.1:5188",
    reuseExistingServer: false,
    timeout: 30_000,
    env: { VITE_CORELY_APP_CENTER_ORIGIN: "http://app.localhost:5188" },
  },
});
