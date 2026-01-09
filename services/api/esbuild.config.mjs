import { build, context } from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";

const isWatch = process.argv.includes("--watch");

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
  plugins: [
    esbuildPluginTsc({
      force: true, // Force use of tsc for decorator metadata
    }),
  ],
};

if (isWatch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build(config);
}
