import type { EmployeeTasksQuery } from "@corely/contracts";
import type { TaskRecord } from "@corely/tasks/task-rules";

function localDay(instant: Date, format: Intl.DateTimeFormat) {
  const parts = format.formatToParts(instant);
  const component = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === name)?.value ?? "";
  return component("year") + "-" + component("month") + "-" + component("day");
}

export function filterTaskList(
  tasks: readonly TaskRecord[],
  criteria: EmployeeTasksQuery,
  timezone: string,
  at: Date
) {
  const clock = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = localDay(at, clock);
  const search = criteria.q.toLowerCase();
  return tasks.filter((task) => {
    if (criteria.status !== "all" && task.status !== criteria.status) {
      return false;
    }
    if (search && !task.title.toLowerCase().includes(search)) {
      return false;
    }
    if (criteria.due === "all") {
      return true;
    }
    if (!task.dueAt || task.status !== "OPEN") {
      return false;
    }
    const due = localDay(new Date(task.dueAt), clock);
    switch (criteria.due) {
      case "today":
        return due === today;
      case "overdue":
        return due < today;
      case "upcoming":
        return due > today;
    }
  });
}
