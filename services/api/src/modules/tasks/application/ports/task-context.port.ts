import type { TaskAttachment, TaskContext, TaskSource } from "@corely/contracts";
import type { TransactionContext, UseCaseContext } from "@corely/kernel";
import type { TaskScope } from "./task-repository.port";

export interface StoredTaskContext {
  comments: TaskContext["comments"];
  sources: TaskSource[];
  files: TaskAttachment[];
}

export interface TaskContextStore {
  get(scope: TaskScope, taskId: string, tx?: TransactionContext): Promise<StoredTaskContext>;
  save(
    scope: TaskScope,
    taskId: string,
    value: StoredTaskContext,
    tx: TransactionContext
  ): Promise<void>;
}

export interface TaskSourceReader {
  canRead(id: string, ctx: UseCaseContext, tx?: TransactionContext): Promise<boolean>;
}

export const TASK_CONTEXT_STORE = Symbol("TASK_CONTEXT_STORE");
export const TASK_SOURCE_READERS = Symbol("TASK_SOURCE_READERS");
export type TaskSourceReaders = Readonly<Partial<Record<TaskSource["kind"], TaskSourceReader>>>;
