import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/observability",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], trace: "off", screenshot: "off" },
  webServer: {
    cwd: "../login",
    command: "pnpm exec vite --host 127.0.0.1 --port 5192",
    url: "http://127.0.0.1:5192",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
