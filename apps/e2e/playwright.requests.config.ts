import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/requests",
  outputDir: "test-results/requests",
  reporter: "list",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 900 },
    baseURL: "http://127.0.0.1:5223",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    reducedMotion: "reduce",
    actionTimeout: 10_000,
    screenshot: "only-on-failure",
  },
  webServer: {
    cwd: "../web",
    command: "pnpm exec vite preview --host 127.0.0.1 --port 5223 --strictPort",
    url: "http://127.0.0.1:5223",
    timeout: 60_000,
    reuseExistingServer: false,
  },
});
