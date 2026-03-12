import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "web-features",
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@corely/auth-client": path.resolve(__dirname, "../auth-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../contracts/src"),
      "@corely/ui": path.resolve(__dirname, "../ui/src"),
      "@corely/web-shared": path.resolve(__dirname, "../web-shared/src"),
    },
  },
});
