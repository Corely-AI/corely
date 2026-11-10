import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { FocusedObservationSchema } from "../../packages/contracts/dist/identity/sso.mjs";

/** Request IDs are deliberately discarded before aggregation. */
export function summarizeFocusedObservations(input) {
  const buckets = new Map();
  let rejected = 0;
  for (const candidate of input) {
    const normalized =
      candidate && typeof candidate === "object" && candidate.eventName === "corely.focused"
        ? Object.fromEntries(Object.entries(candidate).filter(([key]) => key !== "eventName"))
        : candidate;
    const parsed = FocusedObservationSchema.safeParse(normalized);
    if (!parsed.success) {
      rejected++;
      continue;
    }
    const { surface, layer, event, outcome, destination } = parsed.data;
    const key = JSON.stringify([surface, layer, event, outcome, destination ?? null]);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return {
    approval: "pilot baseline and thresholds not approved",
    rejected,
    rows: [...buckets]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [surface, layer, event, outcome, destination] = JSON.parse(key);
        return { surface, layer, event, outcome, destination, count };
      }),
  };
}
export function renderFocusedReport(report) {
  // The report contains only schema enums and numeric counts, never raw input strings.
  const rows = report.rows
    .map(
      (row) =>
        `<tr><td>${row.surface}</td><td>${row.layer}</td><td>${row.event}</td><td>${row.outcome}</td><td>${row.destination ?? "—"}</td><td>${row.count}</td></tr>`
    )
    .join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Focused release observations</title><style>body{font:16px system-ui;background:#f8fafc;color:#0f172a;margin:0;padding:32px}main{max-width:1100px;margin:auto}h1{font-size:30px}p{line-height:1.6}.gate{padding:16px;border:1px solid #b45309;background:#fffbeb;border-radius:8px}.table{overflow:auto}table{border-collapse:collapse;width:100%;background:white}th,td{text-align:left;padding:12px;border-bottom:1px solid #cbd5e1}caption{text-align:left;font-weight:600;padding:16px 0}.muted{color:#475569}</style><main><h1>Focused release observations</h1><p class="gate">Pilot baseline and alert/rollback thresholds require operations approval.</p><p class="muted">Imported event counts for the operator-selected input window. Browser and server events are separate populations. Denials are separate from service unavailability. Counts do not establish unique users or end-to-end conversion.</p><div class="table"><table><caption>Surface adoption and transport outcomes</caption><thead><tr><th scope="col">Surface</th><th scope="col">Layer</th><th scope="col">Event</th><th scope="col">Outcome</th><th scope="col">Destination</th><th scope="col">Count</th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted">Rejected input records: ${report.rejected}. Request identifiers and raw input are absent from this report. Confirm collection coverage and access controls before using this artifact for a pilot decision.</p></main></html>`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lines = fs
    .readFileSync(process.argv[2] ?? 0, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const events = lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  });
  const report = summarizeFocusedObservations(events);
  process.stdout.write(
    process.argv.includes("--html")
      ? renderFocusedReport(report)
      : `${JSON.stringify(report, null, 2)}\n`
  );
}
