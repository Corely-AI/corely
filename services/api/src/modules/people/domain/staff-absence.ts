import type { StaffAbsence, StaffAbsenceRange } from "@corely/contracts";
import { staffDateStart, type AvailabilityWindow } from "./staff-availability";
export function absenceInterval(range: StaffAbsenceRange): AvailabilityWindow {
  if (range.kind === "partial-day") {
    return {
      startAt: new Date(range.startAt).toISOString(),
      endAt: new Date(range.endAt).toISOString(),
    };
  }
  return {
    startAt: staffDateStart(range.startDate, range.timezone),
    endAt: staffDateStart(range.endDate, range.timezone),
  };
}
// Corrections become effective when recorded. Earlier occupancy remains historical fact.
export function absenceBlocks(records: StaffAbsence[]): AvailabilityWindow[] {
  return records.flatMap((record) =>
    record.revisions.flatMap((revision, index) => {
      if (revision.status !== "approved") {
        return [];
      }
      const start = Math.max(
        Date.parse(revision.startAt),
        index === 0 ? -Infinity : Date.parse(revision.changedAt)
      );
      const end = Math.min(
        Date.parse(revision.endAt),
        record.revisions[index + 1] ? Date.parse(record.revisions[index + 1].changedAt) : Infinity
      );
      return start < end
        ? [{ startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() }]
        : [];
    })
  );
}
export function subtractAbsences(
  windows: AvailabilityWindow[],
  blocks: AvailabilityWindow[]
): AvailabilityWindow[] {
  return blocks.reduce(
    (remaining, block) =>
      remaining.flatMap((window) => {
        if (block.startAt >= window.endAt || block.endAt <= window.startAt) {
          return [window];
        }
        return [
          ...(window.startAt < block.startAt
            ? [{ startAt: window.startAt, endAt: block.startAt }]
            : []),
          ...(block.endAt < window.endAt ? [{ startAt: block.endAt, endAt: window.endAt }] : []),
        ];
      }),
    windows
  );
}
