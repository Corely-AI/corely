import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/invoice-links",
  workers: 1,
  expect: { timeout: 20_000 },
  retries: 0,
  timeout: 45000,
  reporter: "list",
  outputDir: "test-results/invoice-links",
  use: {
    baseURL: "http://127.0.0.1:5187",
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    cwd: "../web",
    command: "pnpm exec vite --host 127.0.0.1 --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    timeout: 60000,
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: "/api" },
  },
});
