import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/invoice-links",
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: "list",
  outputDir: "test-results/invoice-links",
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "cohort", use: { baseURL: "http://127.0.0.1:5187" } },
    { name: "rollback", use: { baseURL: "http://127.0.0.1:5186" } },
  ],
  webServer: [true, false].map((enabled) => ({
    cwd: "../web",
    command: `pnpm exec vite --host 127.0.0.1 --port ${enabled ? 5187 : 5186} --strictPort`,
    url: `http://127.0.0.1:${enabled ? 5187 : 5186}`,
    timeout: 60000,
    reuseExistingServer: false,
    env: {
      VITE_API_BASE_URL: "/api",
      VITE_CORELY_INVOICE_LINK_MIGRATION: String(enabled),
      VITE_CORELY_INVOICE_LINK_WORKSPACES: "workspace-a",
    },
  })),
});
