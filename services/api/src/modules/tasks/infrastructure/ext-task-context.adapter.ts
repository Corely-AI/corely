import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter } from "@corely/data";
import { TaskAttachmentSchema, TaskCommentSchema, TaskSourceSchema } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { z } from "zod";
import type { StoredTaskContext, TaskContextStore } from "../application/ports/task-context.port";
import type { TaskScope } from "../application/ports/task-repository.port";

const contextSchema = z.object({
  comments: z.array(TaskCommentSchema),
  sources: z.array(TaskSourceSchema),
  files: z.array(TaskAttachmentSchema),
});

const taskKey = (scope: TaskScope, taskId: string) => ({
  tenantId: scope.tenantId,
  moduleId: "tasks",
  scope: `workspace:${scope.workspaceId}:discussion`,
  key: taskId,
});

@Injectable()
export class ExtTaskContextAdapter implements TaskContextStore {
  constructor(private readonly kv: PrismaExtKvAdapter) {}

  async get(scope: TaskScope, taskId: string, tx?: TransactionContext) {
    const current = await this.kv.get(taskKey(scope, taskId), tx);
    return current ? contextSchema.parse(current.value) : { comments: [], sources: [], files: [] };
  }

  async save(scope: TaskScope, taskId: string, value: StoredTaskContext, tx: TransactionContext) {
    await this.kv.set({ ...taskKey(scope, taskId), value }, tx);
  }
}
