import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/lib": path.resolve(__dirname, "../../packages/web-shared/src/lib"),
      "@/shared": path.resolve(__dirname, "../../packages/web-shared/src/shared"),
      "@/offline": path.resolve(__dirname, "../../packages/web-shared/src/offline"),
      "@": path.resolve(__dirname, "./src"),
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/auth-client": path.resolve(__dirname, "../../packages/auth-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@corely/domain": path.resolve(__dirname, "../../packages/domain/src"),
      "@corely/offline-core": path.resolve(__dirname, "../../packages/offline-core/src"),
      "@corely/offline-web": path.resolve(__dirname, "../../packages/offline-web/src"),
      "@corely/public-urls": path.resolve(__dirname, "../../packages/public-urls/src"),
      "@corely/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@corely/web-features": path.resolve(__dirname, "../../packages/web-features/src"),
      "@corely/web-shared": path.resolve(__dirname, "../../packages/web-shared/src"),
      "@corely/website-blocks": path.resolve(__dirname, "../../packages/website-blocks/src"),
    },
  },
  test: {
    name: "web",
    environment: "jsdom",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
