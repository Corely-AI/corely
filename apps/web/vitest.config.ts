import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "web",
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
