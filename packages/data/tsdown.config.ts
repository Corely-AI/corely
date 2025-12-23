import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  outDir: "dist",
  clean: process.argv.includes("--watch") ? false : true,
  treeshake: true,
  esbuildOptions(options) {
    options.tsconfigRaw = {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    };
  },
});
