import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@corely/contracts": path.resolve(__dirname, "../contracts/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    coverage: {
      enabled: false,
    },
  },
});
