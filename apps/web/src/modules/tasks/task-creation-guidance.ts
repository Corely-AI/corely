import type { TaskCreationGuidance } from "@corely/tasks-ui";

const taskCreationGuidance: ReadonlyMap<string, TaskCreationGuidance> = new Map();

export function getTaskCreationGuidance(workspaceId: string) {
  return taskCreationGuidance.get(workspaceId);
}
