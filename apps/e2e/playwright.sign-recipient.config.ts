import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const port = Number(process.env.SIGN_E2E_RECIPIENT_PORT ?? 48269);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("SIGN_E2E_RECIPIENT_PORT must be a valid TCP port");
}
const baseURL = `http://127.0.0.1:${port}`;
const live = Boolean(process.env.SIGN_FIXTURE_INVITATION);

export default defineConfig({
  testDir: "./tests/sign",
  testMatch: live ? "recipient-live.spec.ts" : "recipient-flow.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 90000,
  use: { baseURL, viewport: { width: 390, height: 844 }, trace: "off" },
  webServer: {
    cwd:
      process.env.SIGN_E2E_PUBLIC_WEB_DIR ??
      fileURLToPath(new URL("../public-web/", import.meta.url)),
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/sign/receive`,
    env: { NEXT_TELEMETRY_DISABLED: "1", SIGN_PUBLIC_ORIGIN: baseURL },
    reuseExistingServer: false,
    timeout: 120000,
  },
  outputDir: live ? "test-results/sign-recipient-live" : "test-results/sign-recipient",
});
