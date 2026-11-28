import type { OperationsBriefingEntry, OperationsToday } from "@corely/contracts";

const MAX_CANDIDATES = 16;
const FRESH_FOR_MS = 30_000;

type Source = Pick<OperationsToday["tasks"], "status" | "observedAt">;

function sourceStatus(source: Source, now: number) {
  const observedAt = source.observedAt ? Date.parse(source.observedAt) : null;
  if (
    (source.status === "fresh" || source.status === "partial") &&
    observedAt !== null &&
    (now - observedAt > FRESH_FOR_MS || observedAt > now)
  ) {
    return "stale";
  }
  return source.status;
}

function freshItems<T>(source: Source & { items: T[] }, now: Date): T[] {
  return sourceStatus(source, now.getTime()) === "fresh" ? source.items : [];
}

const sourceNames = ["appointments", "tasks", "decisions", "exceptions"] as const;

export function briefingSnapshot(today: OperationsToday, now: Date) {
  return {
    date: today.date,
    timezone: today.timezone,
    checkedAt: now.toISOString(),
    sources: sourceNames.map((kind) => ({
      kind,
      status: sourceStatus(today[kind], now.getTime()),
      observedAt: today[kind].observedAt,
    })),
  };
}

export function briefingFacts(
  today: OperationsToday,
  now: Date,
  limit = MAX_CANDIDATES
): OperationsBriefingEntry[] {
  const appointmentHref = (id: string) => `/booking/bookings/${encodeURIComponent(id)}`;
  const relevantTime = (stamp: string) => Date.parse(stamp) >= Date.parse(today.evaluatedAt);
  const byTime = (left: OperationsBriefingEntry, right: OperationsBriefingEntry) =>
    Date.parse(left.at) - Date.parse(right.at) || left.href.localeCompare(right.href);
  const coverage: OperationsBriefingEntry[] =
    sourceStatus(today.appointments, now.getTime()) === "fresh"
      ? freshItems(today.exceptions, now)
          .filter((item) => relevantTime(item.startAt))
          .map((item) => ({
            kind: "coverage",
            at: item.startAt,
            href: appointmentHref(item.appointmentId),
          }))
      : [];
  const coverageLinks = new Set(coverage.map((item) => item.href));
  const appointments: OperationsBriefingEntry[] = freshItems(today.appointments, now)
    .filter(
      (item) =>
        item.status === "CONFIRMED" &&
        relevantTime(item.startAt) &&
        !coverageLinks.has(appointmentHref(item.id))
    )
    .map((item) => ({
      kind: "appointment",
      at: item.startAt,
      href: appointmentHref(item.id),
    }));
  const tasks: OperationsBriefingEntry[] = freshItems(today.tasks, now)
    .filter((item) => item.status === "OPEN")
    .map((item) => ({
      kind: "task",
      at: item.dueAt,
      href: `/tasks?task=${encodeURIComponent(item.id)}`,
    }));
  const decisions: OperationsBriefingEntry[] = freshItems(today.decisions, now)
    .filter((item) => ["SUBMITTED", "RETURNED", "FAILED_APPLICATION"].includes(item.status))
    .map((item) => ({
      kind: "decision",
      at: item.updatedAt,
      href: `/requests/${encodeURIComponent(item.id)}`,
    }));
  return [coverage, decisions, tasks, appointments]
    .flatMap((group) => group.sort(byTime))
    .slice(0, limit);
}
