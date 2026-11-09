import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const runner = path.resolve("scripts/ci/run-focused-checks.sh");
test("unit failure still runs both subsequent checks, retains logs, and fails the job", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "corely-ci-runner-"));
  try {
    fs.writeFileSync(
      path.join(dir, "pnpm"),
      '#!/usr/bin/env bash\nprintf "%s\\n" "$*"\nif [ "$2" = packages/web-shared ]; then exit 7; fi\n',
      { mode: 0o755 }
    );
    const summary = path.join(dir, "summary.md");
    const run = spawnSync("bash", [runner, "app-center"], {
      cwd: dir,
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: summary },
      encoding: "utf8",
    });
    assert.equal(run.status, 1, run.stderr);
    const results = fs.readFileSync(summary, "utf8");
    assert.match(results, /shared-unit: exit 7/);
    assert.match(results, /app-center-unit: exit 0/);
    assert.match(results, /browser: exit 0/);
    for (const name of ["shared-unit", "app-center-unit", "browser"])
      assert.match(
        fs.readFileSync(path.join(dir, "ci-results/focused-app-center", `${name}.log`), "utf8"),
        /Command: pnpm/
      );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("successful Invoice runs only its browser command and exits successfully", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "corely-ci-runner-"));
  try {
    fs.writeFileSync(path.join(dir, "pnpm"), '#!/usr/bin/env bash\nprintf "%s\\n" "$*"\n', {
      mode: 0o755,
    });
    const run = spawnSync("bash", [runner, "invoice"], {
      cwd: dir,
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, GITHUB_STEP_SUMMARY: "" },
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /playwright.invoice.config.ts/);
    assert.doesNotMatch(run.stdout, /vitest|apps\/app-center/);
    assert.equal(
      fs.readFileSync(path.join(dir, "ci-results/focused-invoice/summary.txt"), "utf8"),
      "browser: exit 0\n"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
