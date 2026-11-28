import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeFocusedObservations } from "./focused-release-report.mjs";
test("release report uses bounded dimensions, separates denials and drops private/high-cardinality data", () => {
  const base = { surface: "invoice", layer: "server", event: "api", outcome: "denied" };
  const report = summarizeFocusedObservations([
    { ...base, requestId: "e93f4120-1e2d-49c0-a390-fbc0b5a9f5b9" },
    { eventName: "corely.focused", ...base },
    { ...base, outcome: "unavailable" },
    { ...base, url: "private-url?code=secret" },
    { ...base, surface: "unbounded-customer-name" },
    null,
  ]);
  assert.equal(report.rejected, 3);
  assert.equal(report.rows.length, 2);
  assert.equal(report.rows.find((row) => row.outcome === "denied").count, 2);
  assert.equal(report.rows.find((row) => row.outcome === "unavailable").count, 1);
  assert.doesNotMatch(JSON.stringify(report), /secret|private|requestId|e93f4120|customer-name/);
  assert.match(report.approval, /not approved/);
});
