import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@corely/public-api-client": path.resolve(__dirname, "../../packages/public-api-client/src"),
      "@corely/public-urls": path.resolve(__dirname, "../../packages/public-urls/src"),
      "@corely/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
  test: {
    name: "public-web",
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
  },
});
