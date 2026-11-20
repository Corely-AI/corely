import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/expenses-shell",
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: "list",
  outputDir: "test-results/expenses-shell",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5198",
    screenshot: "only-on-failure",
  },
  webServer: {
    cwd: "../web",
    command: "pnpm exec vite --host 127.0.0.1 --port 5198 --strictPort",
    url: "http://127.0.0.1:5198",
    timeout: 60000,
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "/api",
      VITE_CORELY_APP_CENTER_ORIGIN: "https://app.corely.test:8443",
      VITE_CORELY_INVOICE_LINK_MIGRATION: "false",
    },
  },
});
