import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/focused-ux",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60000,
  outputDir: "test-results/focused-ux",
  projects: ["en", "de", "vi"].map((locale) => ({
    name: locale,
    use: { ...devices["Desktop Chrome"], locale },
  })),
  use: { channel: process.env.PLAYWRIGHT_CHANNEL, trace: "off", screenshot: "only-on-failure" },
  webServer: [
    {
      command: "pnpm exec vite --config ../invoice/vite.config.ts --port 5188",
      url: "http://127.0.0.1:5188",
      env: { VITE_CORELY_APP_CENTER_ORIGIN: "http://app.localhost:5188" },
    },
    {
      cwd: "../app-center",
      command: "pnpm exec vite --host 127.0.0.1 --port 5193",
      url: "http://127.0.0.1:5193",
    },
    {
      cwd: "../login",
      command: "pnpm exec vite --host 127.0.0.1 --port 5192",
      url: "http://127.0.0.1:5192",
    },
  ].map((server) => ({ ...server, timeout: 45000, reuseExistingServer: false })),
});
