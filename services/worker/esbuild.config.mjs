import { build, context } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWatch = process.argv.includes("--watch");
const currentDir = path.dirname(fileURLToPath(import.meta.url));
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

const apiAliasPlugin = {
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
};

const config = {
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
  plugins: [apiAliasPlugin],
};

if (isWatch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(config);
}
