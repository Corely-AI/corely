import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/testing/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outDir: "dist",
  clean: process.argv.includes("--watch") ? false : true,
});
