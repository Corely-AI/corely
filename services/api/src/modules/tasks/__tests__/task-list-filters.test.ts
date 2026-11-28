import { ListEmployeeTasksSchema } from "@corely/contracts";
import type { TaskRecord } from "@corely/tasks/task-rules";
import { describe, expect, it } from "vitest";
import { filterTaskList } from "../domain/task-list-filters";

const at = new Date("2026-03-29T22:00:00.000Z");
const makeTask = (
  title: string,
  dueAt: string | null,
  status: TaskRecord["status"] = "OPEN"
): TaskRecord => ({
  id: title,
  workspaceId: "test-workspace",
  version: 1,
  ownerStaffId: "test-owner",
  ownerName: "Employee",
  title,
  dueAt,
  status,
  completedAt: status === "COMPLETED" ? at.toISOString() : null,
  createdAt: at.toISOString(),
  updatedAt: at.toISOString(),
});

describe("Task list filters", () => {
  it("uses the workspace calendar around a daylight saving boundary", () => {
    const yesterday = makeTask("Yesterday", "2026-03-29T21:59:00Z");
    const today = makeTask("Today", "2026-03-29T22:01:00Z");
    const tomorrow = makeTask("Tomorrow", "2026-03-30T22:00:00Z");
    const tasks = [yesterday, today, tomorrow, makeTask("Undated", null)];
    for (const [due, expected] of [
      ["today", today],
      ["overdue", yesterday],
      ["upcoming", tomorrow],
    ] as const) {
      const query = ListEmployeeTasksSchema.parse({ due });
      expect(filterTaskList(tasks, query, "Europe/Berlin", at)).toEqual([expected]);
    }
    const query = ListEmployeeTasksSchema.parse({ due: "today" });
    expect(filterTaskList(tasks, query, "UTC", at)).toEqual([yesterday, today]);
  });

  it("combines title and status and omits completed and undated work from due buckets", () => {
    const date = "2026-03-29T22:01:00Z";
    const open = makeTask("Process invoice", date);
    const completed = makeTask("Send invoice", date, "COMPLETED");
    const tasks = [open, completed, makeTask("Book venue", date), makeTask("Check invoice", null)];
    const query = ListEmployeeTasksSchema.parse({ due: "today", q: " INVOICE " });
    expect(filterTaskList(tasks, query, "Europe/Berlin", at)).toEqual([open]);
    const done = ListEmployeeTasksSchema.parse({ status: "COMPLETED", q: "invoice" });
    expect(filterTaskList(tasks, done, "Europe/Berlin", at)).toEqual([completed]);
  });
});
