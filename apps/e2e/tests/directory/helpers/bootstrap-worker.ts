import { execSync } from "node:child_process";
import { getRepoRoot, loadDirectoryE2eEnv } from "./env";

loadDirectoryE2eEnv();

export function runOutboxWorkerTick(): void {
  const baseOptions = {
    cwd: getRepoRoot(),
    stdio: "inherit" as const,
    env: {
      ...process.env,
      WORKER_TICK_RUNNERS: "outbox",
    },
  };

  try {
    execSync("pnpm --filter @corely/worker start:tick", baseOptions);
  } catch {
    execSync("pnpm --filter @corely/worker build", baseOptions);
    execSync("pnpm --filter @corely/worker start:tick", baseOptions);
  }
}
