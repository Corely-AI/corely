import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", "identity/sso": "src/identity/sso.schema.ts" },
  format: ["esm", "cjs"],
  dts: true,
  outDir: "dist",
  clean: process.argv.includes("--watch") ? false : true,
});
