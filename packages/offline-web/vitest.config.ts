import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.{spec,test}.ts"],
  },
  resolve: {
    alias: {
      "@kerniflow/offline-core": path.resolve(__dirname, "../offline-core/src"),
    },
  },
});
