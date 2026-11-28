import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import SanitizedReporter from "../../apps/e2e/tests/multi-origin/sanitized-reporter.mjs";
test("multi-origin failures retain bounded diagnostics without protocol proofs, titles or page contents", (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "corely-401-reporter-"));
  const secret = "private-code-password-cookie-invoice-reason";
  let output = "";
  context.mock.method(process.stdout, "write", (chunk) => {
    output += chunk;
    return true;
  });
  try {
    const reporter = new SanitizedReporter();
    reporter.onBegin({ projects: [{ outputDir: directory }] }, { allTests: () => [1] });
    reporter.onTestEnd(
      {
        title: secret,
        location: { line: 99 },
        parent: { project: () => ({ name: "chromium" }) },
        annotations: [
          {
            type: "safe-http",
            description: JSON.stringify({ operation: "/api/bff/invoices", status: 403 }),
          },
          { type: "safe-http", description: JSON.stringify({ operation: secret, status: 401 }) },
          { type: "safe-state", description: secret },
          { type: "safe-state", description: "menu:closed" },
        ],
      },
      {
        status: "failed",
        errors: [{ message: secret, stack: `${secret}\n at multi-origin.spec.ts:123:4` }],
        steps: [
          { title: "open sign-in entry", category: "test.step", steps: [] },
          { title: secret, category: "pw:api", steps: [] },
          { title: secret, category: "test.step", steps: [] },
        ],
      }
    );
    reporter.onError({ message: secret });
    reporter.onEnd({ status: "failed" });
    const saved = fs.readFileSync(path.join(directory, "safe-summary.json"), "utf8");
    assert.ok(!saved.includes(secret) && !output.includes(secret));
    assert.match(saved, /403/);
    assert.match(saved, /open sign-in entry/);
    assert.match(saved, /"line": 99/);
    assert.match(saved, /123/);
    assert.match(saved, /menu:closed/);
  } finally {
    const actual = fs.realpathSync(directory);
    assert.ok(actual.startsWith(fs.realpathSync(os.tmpdir()) + path.sep));
    assert.ok(path.basename(actual).startsWith("corely-401-reporter-"));
    fs.rmSync(actual, { recursive: true, force: true });
  }
});
