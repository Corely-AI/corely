import { Injectable } from "@nestjs/common";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { EmployeeTaskSchema } from "@corely/contracts";
import { z } from "zod";
import type { TaskRecord } from "../domain/task-rules";
import type {
  TaskRepositoryPort,
  TaskScope,
  TaskReplay,
} from "../application/ports/task-repository.port";
const recordSchema = EmployeeTaskSchema.omit({ ownerArchived: true });
const replaySchema = z.object({ fingerprint: z.string(), taskId: z.string().uuid() }).strict();
const keyFor = (scope: TaskScope, kind: string, key: string) => ({
  tenantId: scope.tenantId,
  moduleId: "tasks",
  scope: `workspace:${scope.workspaceId}:${kind}`,
  key,
});
@Injectable()
export class ExtTaskRepositoryAdapter implements TaskRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}
  transaction<T>(scope: TaskScope, work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (client) => {
        await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["tasks", scope.tenantId, scope.workspaceId])}, 0))::text`;
        return work(client as unknown as TransactionContext);
      },
      { timeout: 15000 }
    );
  }
  async list(scope: TaskScope, tx?: TransactionContext): Promise<TaskRecord[]> {
    const { tenantId, moduleId, scope: namespace } = keyFor(scope, "records", "");
    const rows = await getPrismaClient(this.prisma, tx).extKv.findMany({
      where: { tenantId, moduleId, scope: namespace },
      select: { value: true },
    });
    return rows.map((row) => recordSchema.parse(row.value));
  }
  async get(scope: TaskScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "records", id), tx);
    return row ? recordSchema.parse(row.value) : null;
  }
  async save(scope: TaskScope, task: TaskRecord, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "records", task.id), value: task }, tx);
  }
  async replay(scope: TaskScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "commands", key), tx);
    return row ? (replaySchema.parse(row.value) as TaskReplay) : null;
  }
  async saveReplay(scope: TaskScope, key: string, replay: TaskReplay, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "commands", key), value: replay }, tx);
  }
}
