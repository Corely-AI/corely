import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
const e2e = path.join(root, "apps/e2e");
const fromTests = createRequire(path.join(e2e, "package.json"));
const fromPlaywrightTest = createRequire(fromTests.resolve("@playwright/test/package.json"));
// Use the matcher from the installed/pinned runner, including its Windows path behavior.
const { createFileMatcher } = fromPlaywrightTest(
  path.join(path.dirname(fromPlaywrightTest.resolve("playwright/package.json")), "lib/util.js")
);

function ignoredBy(config, file) {
  const source = fs.readFileSync(path.join(e2e, config), "utf8");
  const ast = ts.createSourceFile(config, source, ts.ScriptTarget.Latest, true);
  let patterns;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(ast) === "testIgnore") {
      assert.ok(ts.isArrayLiteralExpression(node.initializer));
      patterns = node.initializer.elements.map((element) => {
        assert.ok(ts.isStringLiteral(element));
        return element.text;
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(patterns, `${config} must declare its isolated-suite exclusions`);
  return createFileMatcher(patterns)(file);
}

// Independent PRs introduce these directories separately; check every one present in this checkout.
for (const suite of ["focused-hr", "invoice-links", "focused-ux", "observability"]) {
  const directory = path.join(e2e, "tests", suite);
  if (!fs.existsSync(directory)) continue;
  test(`${suite} runs only through its dedicated server configuration`, () => {
    const specs = fs.readdirSync(directory).filter((name) => name.endsWith(".spec.ts"));
    assert.ok(specs.length > 0);
    for (const config of ["playwright.config.ts", "playwright.api.config.ts"]) {
      for (const spec of specs) {
        assert.ok(
          ignoredBy(config, path.join(directory, spec)),
          `${config} collects ${suite}/${spec}`
        );
      }
      assert.equal(ignoredBy(config, path.join(e2e, "tests/auth.spec.ts")), false);
    }
  });
}
