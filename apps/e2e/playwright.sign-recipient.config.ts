import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const backoffice = process.env.SIGN_E2E_RECIPIENT_SURFACE === "backoffice";
const port = Number(process.env.SIGN_E2E_RECIPIENT_PORT ?? (backoffice ? 48270 : 48269));
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
      !backoffice && process.env.SIGN_E2E_PUBLIC_WEB_DIR
        ? process.env.SIGN_E2E_PUBLIC_WEB_DIR
        : fileURLToPath(new URL(backoffice ? "../web/" : "../public-web/", import.meta.url)),
    command: backoffice
      ? `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`
      : `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/sign/receive`,
    env: { NEXT_TELEMETRY_DISABLED: "1", SIGN_PUBLIC_ORIGIN: baseURL },
    reuseExistingServer: false,
    timeout: 120000,
  },
  outputDir: `test-results/sign-recipient${backoffice ? "-backoffice" : ""}${live ? "-live" : ""}`,
});
