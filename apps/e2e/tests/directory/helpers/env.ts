import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../../..");

let loaded = false;

export function getRepoRoot(): string {
  return REPO_ROOT;
}

export function loadDirectoryE2eEnv(): void {
  if (loaded) {
    return;
  }

  loadDotEnv({ path: path.join(REPO_ROOT, ".env.e2e") });
  loadDotEnv({ path: path.join(REPO_ROOT, ".env.test") });
  loadDotEnv({ path: path.join(REPO_ROOT, ".env.local") });
  loadDotEnv({ path: path.join(REPO_ROOT, ".env") });

  loaded = true;
}
