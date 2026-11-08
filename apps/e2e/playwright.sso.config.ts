import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/sso",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  use: {
    ignoreHTTPSErrors: true,
    ...(process.env.SSO_BROWSER_CHANNEL ? { channel: process.env.SSO_BROWSER_CHANNEL } : {}),
    launchOptions: {
      args: ["--host-resolver-rules=MAP *.corely.test 127.0.0.1", "--no-proxy-server"],
    },
    // Handoff codes and passwords must never enter persisted traces.
    trace: "off",
    screenshot: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
