/**
 * Builds workspace dependencies of a service, skipping packages whose
 * dist/ is already newer than src/. This makes repeated `dev:api` starts
 * near-instant when packages haven't changed.
 *
 * Usage: node scripts/build-deps-if-stale.mjs @corely/api
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const [, , serviceName] = process.argv;
if (!serviceName) {
  console.error("Usage: node scripts/build-deps-if-stale.mjs <package-name>");
  process.exit(1);
}

const workspaceRoot = process.cwd();

// ── helpers ──────────────────────────────────────────────────────────────────

async function listDirs(base) {
  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isDirectory()).map((e) => path.join(base, e.name));
}

async function collectWorkspacePackages() {
  const roots = ["services", "packages", "apps"].map((d) => path.join(workspaceRoot, d));
  const dirs = [];
  for (const root of roots) dirs.push(...(await listDirs(root)));
  dirs.push(...(await listDirs(path.join(workspaceRoot, "packages", "tooling"))));

  const map = new Map();
  for (const dir of dirs) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(dir, "package.json"), "utf8"));
      if (pkg?.name) map.set(pkg.name, { dir, pkg });
    } catch {
      /* skip */
    }
  }
  return map;
}

/** Newest mtime under a directory (recursive) */
async function newestMtime(dir) {
  let newest = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        newest = Math.max(newest, await newestMtime(full));
      } else {
        const stat = await fs.stat(full);
        newest = Math.max(newest, stat.mtimeMs);
      }
    }
  } catch {
    /* dir doesn't exist → 0 */
  }
  return newest;
}

/** Oldest mtime of direct children in dist/ (the build outputs) */
async function oldestDistMtime(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    if (entries.length === 0) return 0;
    let oldest = Infinity;
    for (const entry of entries) {
      const stat = await fs.stat(path.join(dir, entry.name));
      oldest = Math.min(oldest, stat.mtimeMs);
    }
    return oldest;
  } catch {
    return 0; // dist doesn't exist
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

const packages = await collectWorkspacePackages();
const service = packages.get(serviceName);
if (!service) {
  console.error(`Package not found: ${serviceName}`);
  process.exit(1);
}

const deps = Object.entries(service.pkg.dependencies ?? {})
  .filter(([, v]) => typeof v === "string" && v.startsWith("workspace:"))
  .map(([name]) => name);

const stale = [];
const fresh = [];

for (const depName of deps) {
  const dep = packages.get(depName);
  if (!dep) continue;

  const hasBuild = dep.pkg.scripts?.build;
  if (!hasBuild) {
    fresh.push(depName);
    continue;
  }

  const srcDir = path.join(dep.dir, "src");
  const distDir = path.join(dep.dir, "dist");

  const srcTime = await newestMtime(srcDir);
  const distTime = await oldestDistMtime(distDir);

  if (distTime === 0 || srcTime > distTime) {
    stale.push(depName);
  } else {
    fresh.push(depName);
  }
}

if (fresh.length > 0) {
  console.log(`[build-deps] ✔ ${fresh.length} packages up-to-date, skipped`);
}

if (stale.length === 0) {
  console.log("[build-deps] All dependencies are fresh — nothing to build");
  process.exit(0);
}

console.log(`[build-deps] Building ${stale.length} stale packages: ${stale.join(", ")}`);

const filters = stale.map((name) => `--filter '${name}'`).join(" ");
try {
  execSync(`pnpm ${filters} build`, {
    cwd: workspaceRoot,
    stdio: "inherit",
    shell: true,
  });
} catch {
  process.exit(1);
}
