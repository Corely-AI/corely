import { defineConfig } from "vitest/config";
import base from "./vitest.config";
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: [
      "src/modules/booking/__tests__/openbuk*.{spec,test}.ts",
      "src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts",
      "src/modules/workspaces/__tests__/pilot-setup.int.test.ts",
    ],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
