import type { EmployeeTask } from "@corely/contracts";
// Persist the assignment name for history even if the staff profile is later unavailable.
export type TaskRecord = Omit<EmployeeTask, "ownerArchived">;
export function transitionTask(task: TaskRecord, completed: boolean, now: string): TaskRecord {
  return {
    ...task,
    status: completed ? "COMPLETED" : "OPEN",
    completedAt: completed ? now : null,
    version: task.version + 1,
    updatedAt: now,
  };
}
