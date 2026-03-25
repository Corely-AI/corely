import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/auth-client": path.resolve(__dirname, "../../packages/auth-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@corely/offline-core": path.resolve(__dirname, "../../packages/offline-core/src"),
      "@corely/offline-rn": path.resolve(__dirname, "../../packages/offline-rn/src"),
      "@corely/pos-core": path.resolve(__dirname, "../../packages/pos-core/src"),
      "@corely/pos-hardware": path.resolve(__dirname, "../../packages/pos-hardware/src"),
    },
  },
  test: {
    name: "pos",
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
  },
});
