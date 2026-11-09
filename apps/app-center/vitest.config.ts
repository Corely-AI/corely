import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: "app-center",
      environment: "jsdom",
      include: ["src/**/*.spec.{ts,tsx}"],
    },
  })
);
