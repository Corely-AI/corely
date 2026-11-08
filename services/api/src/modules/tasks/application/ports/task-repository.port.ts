import type { TransactionContext } from "@corely/kernel";
import type { TaskRecord } from "../../domain/task-rules";
export interface TaskScope {
  tenantId: string;
  workspaceId: string;
}
export interface TaskReplay {
  fingerprint: string;
  taskId: string;
}
export interface TaskRepositoryPort {
  transaction<T>(scope: TaskScope, work: (tx: TransactionContext) => Promise<T>): Promise<T>;
  list(scope: TaskScope, tx?: TransactionContext): Promise<TaskRecord[]>;
  get(scope: TaskScope, id: string, tx?: TransactionContext): Promise<TaskRecord | null>;
  save(scope: TaskScope, task: TaskRecord, tx: TransactionContext): Promise<void>;
  replay(scope: TaskScope, key: string, tx: TransactionContext): Promise<TaskReplay | null>;
  saveReplay(
    scope: TaskScope,
    key: string,
    replay: TaskReplay,
    tx: TransactionContext
  ): Promise<void>;
}
export const TASK_REPOSITORY = Symbol("TASK_REPOSITORY");
