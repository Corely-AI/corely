import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  clean: true,
  format: ["cjs", "esm"],
  dts: true,
  external: [
    // Don't bundle the API service - it will be imported at runtime
    /^\.\.\/\.\.\/\.\.\/services\//,
  ],
});
