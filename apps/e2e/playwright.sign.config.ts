import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/sign",
  testMatch: "template-authoring.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://127.0.0.1:48267", trace: "off" },
  webServer: {
    command: "pnpm --filter @corely/web exec vite --host 127.0.0.1 --port 48267 --strictPort",
    url: "http://127.0.0.1:48267",
    reuseExistingServer: false,
    timeout: 60000,
  },
  timeout: 60000,
  outputDir: "test-results/sign",
});
