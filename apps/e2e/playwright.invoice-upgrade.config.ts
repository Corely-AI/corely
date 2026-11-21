import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./invoice-upgrade",
  testMatch: "invoice-upgrade.e2e.spec.ts",
  reporter: "list",
  workers: 1,
  use: {
    baseURL: process.env.INVOICE_UPGRADE_WEB_URL || "http://127.0.0.1:8149",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
