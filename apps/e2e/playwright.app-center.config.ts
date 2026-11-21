import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/app-center",
  workers: 1,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  outputDir: "test-results/app-center",
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    baseURL: "http://127.0.0.1:5193",
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    cwd: "../web",
    env: { VITE_CORELY_APP_CENTER_ORIGIN: "http://127.0.0.1:5193" },
    command: "pnpm exec vite --host 127.0.0.1 --port 5193",
    url: "http://127.0.0.1:5193",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
