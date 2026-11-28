import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/operations-today",
  outputDir: "test-results/operations-today",
  reporter: "list",
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 900 },
    baseURL: "http://127.0.0.1:5225",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    reducedMotion: "reduce",
    actionTimeout: 10_000,
    screenshot: "only-on-failure",
  },
  webServer: {
    cwd: "../web",
    command: "pnpm exec vite preview --host 127.0.0.1 --port 5225 --strictPort",
    url: "http://127.0.0.1:5225",
    timeout: 60_000,
    reuseExistingServer: false,
  },
});
