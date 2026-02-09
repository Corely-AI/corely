import { defineWorkspace } from "vitest/config";
import { execSync } from "node:child_process";

function hasDockerRuntime(): boolean {
  if (process.env.FORCE_FULL_INT === "1") {
    return true;
  }
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const dockerAvailable = hasDockerRuntime();

if (!dockerAvailable) {
  console.warn(
    "[vitest.int] Docker runtime not available; running container-free integration subset only. " +
      "Set FORCE_FULL_INT=1 to force full suite."
  );
}

export default defineWorkspace([
  {
    extends: "./services/api/vitest.config.ts",
    root: "./services/api",
    test: {
      include: dockerAvailable ? ["src/**/*.int.test.ts"] : ["src/__tests__/di-smoke.int.test.ts"],
      exclude: [],
    },
  },
  {
    extends: "./services/worker/vitest.config.ts",
    root: "./services/worker",
    test: {
      include: dockerAvailable
        ? ["src/**/*.int.test.ts"]
        : [
            "src/modules/outbox/__tests__/outbox.int.test.ts",
            "src/infrastructure/job-lock.service.int.test.ts",
          ],
      exclude: [],
    },
  },
]);
