import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./customer-upgrade",
  reporter: "list",
  workers: 1,
  use: { baseURL: process.env.CUSTOMER_UPGRADE_WEB_URL || "http://127.0.0.1:8153" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
