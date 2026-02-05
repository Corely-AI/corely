import { defineConfig } from "vitest/config";
import path from "path";
import { transform } from "@swc/core";

export default defineConfig({
  plugins: [
    {
      name: "swc-decorator-metadata",
      enforce: "pre",
      async transform(code, id) {
        if (!id.endsWith(".ts") && !id.endsWith(".tsx")) {
          return null;
        }
        if (id.includes("node_modules")) {
          return null;
        }
        const result = await transform(code, {
          filename: id,
          jsc: {
            parser: {
              syntax: "typescript",
              decorators: true,
              dynamicImport: true,
            },
            transform: {
              decoratorMetadata: true,
              legacyDecorator: true,
            },
            target: "es2022",
            keepClassNames: true,
          },
          module: {
            type: "es6",
          },
          sourceMaps: true,
        });
        return {
          code: result.code,
          map: result.map,
        };
      },
    },
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.test.tsx", "src/**/*.spec.tsx"],
    // Allow *.int.test.ts so integration workspace can reuse this config
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@corely/contracts": path.resolve(__dirname, "../..", "packages/contracts/src"),
      "@corely/core": path.resolve(__dirname, "../..", "packages/core/src"),
      "@corely/testkit": path.resolve(__dirname, "../..", "packages/testkit/src"),
      "@corely/kernel": path.resolve(__dirname, "../..", "packages/kernel/src"),
      "@corely/data": path.resolve(__dirname, "../..", "packages/data/src"),
      "@corely/public-urls": path.resolve(__dirname, "../..", "packages/public-urls/src"),
    },
  },
});
