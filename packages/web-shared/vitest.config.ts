import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    name: "web-shared-session",
    environment: "jsdom",
    globals: true,
    include: ["src/session/**/*.spec.ts", "src/session/**/*.spec.tsx"],
  },
  resolve: {
    alias: {
      "@corely/contracts": path.resolve(__dirname, "../contracts/src"),
      "@corely/ui": path.resolve(__dirname, "../ui/src"),
      "@corely/web-shared": path.resolve(__dirname, "src"),
    },
  },
});
