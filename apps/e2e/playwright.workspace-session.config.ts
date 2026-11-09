import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/workspace-session",
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  outputDir: "test-results/workspace-session",
  use: { ...devices["Desktop Chrome"], trace: "off", screenshot: "only-on-failure" },
  webServer: {
    command:
      "pnpm exec vite --config ../../packages/web-shared/testkit/browser/vite.config.ts --port 5187",
    url: "http://127.0.0.1:5187",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
