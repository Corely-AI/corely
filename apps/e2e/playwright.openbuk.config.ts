import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/openbuk",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60000,
  use: {
    channel: process.env.OPENBUK_BROWSER_CHANNEL,
    baseURL: process.env.OPENBUK_BASE_URL || "http://127.0.0.1:8091",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
