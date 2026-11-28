import { describe, it, expect } from "vitest";
import { addCivilDays, civilDateAt, civilDayWindow, resolveCivilMinute } from "@corely/kernel";
import {
  occurrenceId,
  catchupDates,
  planOnDate,
  isPausedOnDate,
  type ChecklistRecord,
} from "../domain/recurring-checklist";
const template: ChecklistRecord = {
  id: occurrenceId("template"),
  workspaceId: "workspace",
  timezone: "Europe/Berlin",
  state: "ACTIVE",
  version: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  nextEvaluationAt: "2026-01-01T00:00:00Z",
  pauses: [],
  plans: [
    {
      version: 1,
      title: "Open",
      effectiveFrom: "2026-01-01",
      effectiveUntil: null,
      dueTime: "09:00",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      assigneeIds: [occurrenceId("owner")],
      steps: [{ id: occurrenceId("step"), title: "Unlock" }],
      publisherUserId: "manager",
    },
  ],
};
describe("Recurring checklist civil clock rules", () => {
  it("skips spring gaps and chooses the first occurrence in autumn folds", () => {
    expect(resolveCivilMinute("2026-03-29", "02:30", "Europe/Berlin")).toBeNull();
    expect(resolveCivilMinute("2026-10-25", "02:30", "Europe/Berlin")?.toISOString()).toBe(
      "2026-10-25T00:30:00.000Z"
    );
    const spring = civilDayWindow("2026-03-29", "Europe/Berlin");
    const fall = civilDayWindow("2026-10-25", "Europe/Berlin");
    expect(spring && (+spring.to - +spring.from) / 3600000).toBe(23);
    expect(fall && (+fall.to - +fall.from) / 3600000).toBe(25);
  });
  it("handles half-hour DST, midnight and skipped civil dates", () => {
    expect(resolveCivilMinute("2026-10-04", "02:15", "Australia/Lord_Howe")).toBeNull();
    expect(resolveCivilMinute("2026-04-05", "01:45", "Australia/Lord_Howe")?.toISOString()).toBe(
      "2026-04-04T14:45:00.000Z"
    );
    expect(resolveCivilMinute("2011-12-30", "09:00", "Pacific/Apia")).toBeNull();
    expect(civilDayWindow("2011-12-30", "Pacific/Apia")).toBeNull();
    expect(civilDateAt(new Date("2026-11-08T23:30:00Z"), "Europe/Berlin")).toBe("2026-11-09");
    expect(addCivilDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("bounds delayed catch-up by local dates through DST, with no stale backlog", () => {
    expect(catchupDates(template, new Date("2026-03-29T23:30:00Z"))).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
    const future = { ...template, plans: [{ ...template.plans[0], effectiveFrom: "2026-04-01" }] };
    expect(catchupDates(future, new Date("2026-03-29T23:30:00Z"))).toEqual([]);
  });
  it("cuts over future plans without changing historical dates and honours inclusive ends/weekdays/pauses", () => {
    const edited = {
      ...template,
      plans: [
        template.plans[0],
        {
          ...template.plans[0],
          version: 2,
          effectiveFrom: "2026-11-09",
          effectiveUntil: "2026-11-10",
          weekdays: [1, 2],
        },
      ],
    };
    expect(planOnDate(edited, "2026-11-08")?.version).toBe(1);
    expect(planOnDate(edited, "2026-11-09")?.version).toBe(2);
    expect(planOnDate(edited, "2026-11-10")?.version).toBe(2);
    expect(planOnDate(edited, "2026-11-11")).toBeNull();
    expect(
      isPausedOnDate(
        { pauses: [{ fromDate: "2026-11-08", throughDate: "2026-11-09" }] },
        "2026-11-09"
      )
    ).toBe(true);
    expect(
      isPausedOnDate(
        { pauses: [{ fromDate: "2026-11-08", throughDate: "2026-11-09" }] },
        "2026-11-10"
      )
    ).toBe(false);
  });
  it("uses scope, template, local date and assignee for stable collision-safe IDs", () => {
    const id = occurrenceId("tenant", "workspace", "template", "2026-11-08", "owner");
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(occurrenceId("tenant", "workspace", "template", "2026-11-08", "owner")).toBe(id);
    expect(occurrenceId("other", "workspace", "template", "2026-11-08", "owner")).not.toBe(id);
    expect(occurrenceId("tenant", "workspace", "template", "2026-11-09", "owner")).not.toBe(id);
    expect(occurrenceId("a:b", "c")).not.toBe(occurrenceId("a", "b:c"));
  });
});
