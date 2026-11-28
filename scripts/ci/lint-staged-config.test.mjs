import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const config = require("../../.lintstagedrc.cjs");
test("lint-staged excludes E2E for absolute and relative inputs but retains application checks", () => {
  const run = config["**/*.{ts,tsx,js,jsx}"];
  const app = path.resolve("apps/web/src/app.tsx");
  const browser = path.resolve("apps/e2e/tests/example.spec.ts");
  assert.deepEqual(run([browser]), []);
  assert.deepEqual(run(["apps/e2e/playwright.config.ts"]), []);
  assert.deepEqual(run([browser, app]), [`eslint --fix --no-warn-ignored ${app}`]);
  assert.equal(config["**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css,scss}"]([browser, app]).length, 1);
});
