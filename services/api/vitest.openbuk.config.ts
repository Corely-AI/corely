import { defineConfig } from "vitest/config";
import base from "./vitest.config";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "src/modules/booking/__tests__/openbuk*.{spec,test}.ts",
      "src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts",
    ],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
