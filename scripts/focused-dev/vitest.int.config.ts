import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["scripts/focused-dev/*.int.test.ts"], environment: "node" },
});
