import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["scripts/focused-dev/*.spec.ts"], environment: "node" },
});
