import fs from "node:fs/promises";
import path from "node:path";

const [, , serviceName] = process.argv;

if (!serviceName) {
  console.error("Usage: node scripts/check-service-deps-built.mjs <package-name>");
  process.exit(1);
}

const workspaceRoot = process.cwd();

const listDirs = async (base) => {
  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(base, entry.name));
};

const collectWorkspacePackages = async () => {
  const roots = ["services", "packages", "apps"].map((dir) => path.join(workspaceRoot, dir));
  const packageDirs = [];

  for (const root of roots) {
    packageDirs.push(...(await listDirs(root)));
  }

  const toolingRoot = path.join(workspaceRoot, "packages", "tooling");
  packageDirs.push(...(await listDirs(toolingRoot)));

  const packageMap = new Map();

  for (const dir of packageDirs) {
    const pkgPath = path.join(dir, "package.json");
    try {
      const raw = await fs.readFile(pkgPath, "utf8");
      const pkg = JSON.parse(raw);
      if (pkg?.name) {
        packageMap.set(pkg.name, { dir, pkg });
      }
    } catch {
      // Ignore directories without a package.json
    }
  }

  return packageMap;
};

const addIfString = (value, list) => {
  if (typeof value === "string") {
    list.push(value);
  }
};

const resolveRootExport = (pkg) => {
  if (!pkg.exports) return null;
  return pkg.exports["."] ?? pkg.exports;
};

const collectExpectedFiles = (pkg) => {
  const required = [];
  const optional = [];
  const types = [];

  const rootExport = resolveRootExport(pkg);

  if (typeof rootExport === "string") {
    required.push(rootExport);
  } else if (rootExport && typeof rootExport === "object") {
    if (rootExport.import) {
      required.push(rootExport.import);
    } else if (rootExport.default) {
      required.push(rootExport.default);
    }

    addIfString(rootExport.require, optional);
    addIfString(rootExport.types, types);
  }

  if (required.length === 0) {
    if (pkg.module) {
      required.push(pkg.module);
    } else if (pkg.main) {
      required.push(pkg.main);
    }
  } else {
    addIfString(pkg.module, optional);
    addIfString(pkg.main, optional);
  }

  addIfString(pkg.types, types);

  return { required, optional, types };
};

const buildTypeCandidates = (typesPath) => {
  if (!typesPath) return [];
  if (!typesPath.endsWith(".d.ts")) {
    return [typesPath];
  }
  return [
    typesPath,
    typesPath.replace(/\.d\.ts$/, ".d.mts"),
    typesPath.replace(/\.d\.ts$/, ".d.cts"),
  ];
};

const fileExists = async (absPath) => {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
};

const run = async () => {
  const workspacePackages = await collectWorkspacePackages();
  const service = workspacePackages.get(serviceName);

  if (!service) {
    console.error(`Workspace package not found: ${serviceName}`);
    process.exit(1);
  }

  const dependencies = {
    ...(service.pkg.dependencies ?? {}),
    ...(service.pkg.optionalDependencies ?? {}),
    ...(service.pkg.peerDependencies ?? {}),
  };

  const workspaceDeps = Object.entries(dependencies)
    .filter(([, version]) => typeof version === "string" && version.startsWith("workspace:"))
    .map(([name]) => name)
    .sort();

  if (workspaceDeps.length === 0) {
    console.log(`[deps-check] ${serviceName} has no workspace dependencies.`);
    return;
  }

  const missingFiles = new Set();
  const missingPackages = new Set();
  const skippedPackages = [];
  const optionalMissing = new Set();
  const typesMissing = new Set();

  for (const depName of workspaceDeps) {
    const dep = workspacePackages.get(depName);
    if (!dep) {
      missingPackages.add(depName);
      continue;
    }

    const expectedFiles = collectExpectedFiles(dep.pkg);
    if (
      expectedFiles.required.length === 0 &&
      expectedFiles.optional.length === 0 &&
      expectedFiles.types.length === 0
    ) {
      skippedPackages.push(depName);
      continue;
    }

    for (const relPath of expectedFiles.required) {
      const absPath = path.join(dep.dir, relPath);
      if (!(await fileExists(absPath))) {
        missingFiles.add(`${depName}: ${path.relative(workspaceRoot, absPath)}`);
      }
    }

    for (const relPath of expectedFiles.optional) {
      const absPath = path.join(dep.dir, relPath);
      if (!(await fileExists(absPath))) {
        optionalMissing.add(`${depName}: ${path.relative(workspaceRoot, absPath)}`);
      }
    }

    for (const relPath of expectedFiles.types) {
      const candidates = buildTypeCandidates(relPath);
      const found = await Promise.all(
        candidates.map((candidate) => fileExists(path.join(dep.dir, candidate)))
      );
      if (!found.some(Boolean)) {
        typesMissing.add(
          `${depName}: ${path.relative(workspaceRoot, path.join(dep.dir, relPath))}`
        );
      }
    }
  }

  if (missingPackages.size > 0 || missingFiles.size > 0) {
    console.error(`[deps-check] Missing build outputs for ${serviceName}:`);
    for (const depName of Array.from(missingPackages).sort()) {
      console.error(`- workspace package not found: ${depName}`);
    }
    for (const missing of Array.from(missingFiles).sort()) {
      console.error(`- ${missing}`);
    }
    process.exit(1);
  }

  if (skippedPackages.length > 0) {
    console.warn(
      `[deps-check] Skipped ${skippedPackages.length} packages with no declared outputs.`
    );
  }

  if (optionalMissing.size > 0) {
    console.warn(`[deps-check] Optional outputs missing (non-blocking):`);
    for (const missing of Array.from(optionalMissing).sort()) {
      console.warn(`- ${missing}`);
    }
  }

  if (typesMissing.size > 0) {
    console.warn(`[deps-check] Type outputs missing (non-blocking):`);
    for (const missing of Array.from(typesMissing).sort()) {
      console.warn(`- ${missing}`);
    }
  }

  console.log(`[deps-check] Required workspace dependency outputs present for ${serviceName}.`);
};

run().catch((error) => {
  console.error("[deps-check] Failed to verify workspace dependencies.");
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
