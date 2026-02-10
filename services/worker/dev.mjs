import { spawn } from "child_process";
import { context } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let nodeProcess = null;
let restarting = false;
let shuttingDown = false;
let pendingRestartReason = null;
let forceKillTimer = null;
let crashRestartTimer = null;
let crashStreak = 0;
const envWatchers = [];
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const apiSrcDir = path.resolve(currentDir, "../api/src");

function resolveFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.mjs"),
    path.join(basePath, "index.cjs"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return basePath;
}

function clearForceKillTimer() {
  if (!forceKillTimer) {
    return;
  }
  clearTimeout(forceKillTimer);
  forceKillTimer = null;
}

function clearCrashRestartTimer() {
  if (!crashRestartTimer) {
    return;
  }
  clearTimeout(crashRestartTimer);
  crashRestartTimer = null;
}

function spawnWorker(reason) {
  if (shuttingDown) {
    return;
  }

  clearCrashRestartTimer();
  clearForceKillTimer();
  console.log(`\n🚀 Starting worker (${reason})...\n`);

  const child = spawn("node", ["dist/main.js"], {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  nodeProcess = child;
  child.once("exit", (code, signal) => {
    if (nodeProcess !== child) {
      return;
    }
    nodeProcess = null;
    clearForceKillTimer();

    if (restarting) {
      restarting = false;
      const nextReason = pendingRestartReason ?? "rebuild";
      pendingRestartReason = null;
      spawnWorker(nextReason);
      return;
    }

    if (shuttingDown) {
      return;
    }

    if (code === 0 && signal === null) {
      console.warn("[worker-dev] worker exited cleanly; waiting for file changes");
      return;
    }

    crashStreak += 1;
    const backoffMs = Math.min(5_000, 250 * Math.pow(2, Math.min(crashStreak, 4)));
    console.warn(
      `[worker-dev] worker exited (code=${code ?? "null"}, signal=${signal ?? "null"}); restarting in ${backoffMs}ms`
    );
    crashRestartTimer = setTimeout(() => {
      crashRestartTimer = null;
      spawnWorker("crash-restart");
    }, backoffMs);
  });
}

function requestRestart(reason) {
  if (shuttingDown) {
    return;
  }

  pendingRestartReason = reason;
  crashStreak = 0;

  if (!nodeProcess) {
    spawnWorker(reason);
    return;
  }
  if (restarting) {
    return;
  }

  restarting = true;
  nodeProcess.kill("SIGTERM");
  forceKillTimer = setTimeout(() => {
    if (nodeProcess) {
      nodeProcess.kill("SIGKILL");
    }
  }, 5_000);
}

function watchEnvFile(relativePath) {
  const fullPath = path.resolve(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    return;
  }

  const watcher = fs.watch(fullPath, () => {
    console.log(`[worker-dev] detected ${relativePath} change, restarting worker`);
    requestRestart("env-change");
  });
  envWatchers.push(watcher);
}

const buildContext = await context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist",
  sourcemap: true,
  packages: "external",
  tsconfig: "tsconfig.json",
  logLevel: "info",
  plugins: [
    {
      name: "api-alias",
      setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => ({
          path: resolveFile(path.resolve(apiSrcDir, args.path.slice(2))),
        }));

        build.onResolve({ filter: /^@shared\// }, (args) => ({
          path: resolveFile(
            path.resolve(apiSrcDir, "shared", args.path.slice("@shared/".length))
          ),
        }));
      },
    },
    {
      name: "restart-worker",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            requestRestart("rebuild");
          }
        });
      },
    },
  ],
});

console.log("👀 Watching for changes...\n");

await buildContext.watch();
watchEnvFile(".env");
watchEnvFile(".env.local");
watchEnvFile(".env.dev");

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[worker-dev] received ${signal}, shutting down`);

  clearCrashRestartTimer();
  clearForceKillTimer();
  for (const watcher of envWatchers) {
    watcher.close();
  }

  if (nodeProcess) {
    const child = nodeProcess;
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (nodeProcess === child) {
          child.kill("SIGKILL");
        }
        resolve();
      }, 5_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    nodeProcess = null;
  }

  await buildContext.dispose();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
