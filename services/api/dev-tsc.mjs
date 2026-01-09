#!/usr/bin/env node
import { spawn, spawnSync } from "child_process";
import { once } from "events";
import net from "node:net";

let nodeProcess = null;
let buildProcess = null;
let restartPromise = Promise.resolve();

const apiPort = Number(process.env.API_PORT || 3000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPortFree = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "0.0.0.0");
  });

const killPortOccupants = async (port) => {
  if (process.platform === "win32") return false;

  try {
    const { stdout } = spawnSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" });
    const pids = stdout
      .split(/\s+/)
      .map((pid) => pid.trim())
      .filter(Boolean);

    if (!pids.length) return false;

    console.warn(`[dev] Port ${port} is busy; terminating PIDs ${pids.join(", ")}`);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // ignore
      }
    }

    await sleep(400);

    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }

    return true;
  } catch (error) {
    console.warn(`[dev] Could not inspect port ${port}: ${error?.message ?? error}`);
    return false;
  }
};

const waitForPortToClose = async (port, attempts = 15, delayMs = 200) => {
  for (let i = 0; i < attempts; i++) {
    if (await isPortFree(port)) return true;
    await sleep(delayMs);
  }

  return await isPortFree(port);
};

const ensurePortFree = async (port) => {
  if (await isPortFree(port)) return;

  await killPortOccupants(port);

  const freed = await waitForPortToClose(port);
  if (!freed) {
    throw new Error(`Port ${port} is still busy. Set API_PORT or free it manually.`);
  }
};

// Check if debug mode is enabled
const isDebugMode = process.argv.includes("--inspect") || process.env.NODE_DEBUG === "true";
const debugPort = process.env.DEBUG_PORT || "9229";

const stopNode = async () => {
  if (!nodeProcess) return;

  const proc = nodeProcess;
  nodeProcess = null;

  proc.kill("SIGTERM");

  try {
    await Promise.race([once(proc, "exit"), new Promise((r) => setTimeout(r, 5000))]);
  } finally {
    if (!proc.killed) {
      proc.kill("SIGKILL");
    }
  }

  await ensurePortFree(apiPort);
};

const startNode = async () => {
  await ensurePortFree(apiPort);

  console.log(
    `\n🚀 Starting server${isDebugMode ? " (Debug Mode on port " + debugPort + ")" : ""}...\n`
  );

  const nodeArgs = isDebugMode
    ? [`--inspect=0.0.0.0:${debugPort}`, "dist/main.js"]
    : ["dist/main.js"];

  nodeProcess = spawn("node", nodeArgs, {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
};

const restartNode = () => {
  restartPromise = restartPromise.then(async () => {
    if (nodeProcess) {
      console.log("🔄 Restarting server...");
    }

    try {
      await stopNode();
      await startNode();
    } catch (error) {
      console.error(`[dev] Failed to restart: ${error?.message ?? error}`);
    }
  });
};

// Start TypeScript compiler in watch mode
console.log("🔨 Starting TypeScript compiler in watch mode...");

buildProcess = spawn("pnpm", ["exec", "tsc", "-w", "-p", "tsconfig.json"], {
  stdio: "pipe",
  shell: true,
  env: { ...process.env, FORCE_COLOR: "1" },
});

let initialBuildComplete = false;

buildProcess.stdout.on("data", (data) => {
  const output = data.toString();
  console.log(output);

  // Check if initial compilation is complete or if a rebuild happened
  if (output.includes("Watching for file changes") || output.includes("Found 0 errors")) {
    if (!initialBuildComplete) {
      initialBuildComplete = true;
      restartNode();
    } else {
      // Restart on subsequent builds
      restartNode();
    }
  }
});

buildProcess.stderr.on("data", (data) => {
  console.error(data.toString());
});

process.on("SIGINT", async () => {
  await stopNode();
  if (buildProcess) buildProcess.kill();
  process.exit(0);
});
