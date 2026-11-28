import fs from "node:fs";
import path from "node:path";
const phases = new Set([
  "sign in and select Invoice",
  "verify host cookies and workspace handoff",
  "open sign-in entry",
  "enter synthetic credentials",
  "launch focused Invoice",
]);
const operations = new Set([
  "/api/session/current",
  "/api/session/preauth",
  "/api/session/login",
  "/api/session/logout",
  "/api/session/",
  "/api/bff/workspaces",
  "/api/bff/menu",
  "/api/bff/invoices",
  "/sso/",
  "/auth/",
  "/assets/",
  "other",
]);
function stepNames(steps) {
  return steps.flatMap((step) => [
    ...(step.category === "test.step" && phases.has(step.title) ? [step.title] : []),
    ...stepNames(step.steps ?? []),
  ]);
}
/** Never serialize titles, errors, API step descriptions, snapshots or protocol URLs. */
export default class SanitizedReporter {
  records = [];
  directory = path.resolve("test-results/multi-origin");
  onBegin(config, suite) {
    this.directory = config.projects[0].outputDir;
    process.stdout.write(`Running ${suite.allTests().length} multi-origin checks\n`);
  }
  onStepBegin(_test, _result, step) {
    if (step.category === "test.step" && phases.has(step.title)) {
      process.stdout.write(`Phase: ${step.title}\n`);
    }
  }
  onTestEnd(test, result) {
    const browser = ["chromium", "webkit"].includes(test.parent.project()?.name)
      ? test.parent.project().name
      : "unknown";
    const status = ["passed", "failed", "timedOut", "skipped", "interrupted"].includes(
      result.status
    )
      ? result.status
      : "unknown";
    const http = test.annotations
      .filter((entry) => entry.type === "safe-http")
      .flatMap((entry) => {
        try {
          const value = JSON.parse(entry.description);
          return operations.has(value.operation) &&
            Number.isInteger(value.status) &&
            value.status >= 400 &&
            value.status <= 599
            ? [{ operation: value.operation, status: value.status }]
            : [];
        } catch {
          return [];
        }
      });
    const record = {
      source: "multi-origin.spec.ts",
      line: Number.isInteger(test.location?.line) ? test.location.line : 0,
      browser,
      status,
      phases: stepNames(result.steps),
      http,
      states: test.annotations
        .filter(
          (entry) =>
            entry.type === "safe-state" &&
            /^(?:location:(?:app|invoice|login|hr|other)|(?:preauth|central|app-session):(?:true|false)|menu:(?:open|closed|none)|network:(?:aborted|connection-closed|connection-reset|tunnel-failed|tls-failed|other))$/.test(
              entry.description ?? ""
            )
        )
        .map((entry) => entry.description),
      failureLines: (result.errors ?? []).flatMap((error) =>
        [...(error.stack ?? "").matchAll(/multi-origin\.spec\.ts:(\d+):\d+/g)].map((match) =>
          Number(match[1])
        )
      ),
    };
    this.records.push(record);
    process.stdout.write(
      `${status}: [${browser}] ${record.source}:${record.line}${record.failureLines.length ? ` assertion lines ${record.failureLines.join(",")}` : ""}${http.length ? ` HTTP ${http.map((event) => event.operation + ":" + event.status).join(", ")}` : ""} ${record.states.join(" ")}\n`
    );
  }
  onError() {
    process.stdout.write(
      "Multi-origin runner reported an error; use the documented isolated reproduction.\n"
    );
  }
  onEnd(result) {
    fs.mkdirSync(this.directory, { recursive: true });
    fs.writeFileSync(
      path.join(this.directory, "safe-summary.json"),
      JSON.stringify({ status: result.status, tests: this.records }, null, 2)
    );
    process.stdout.write(`Multi-origin result: ${result.status} (${this.records.length} tests)\n`);
  }
}
