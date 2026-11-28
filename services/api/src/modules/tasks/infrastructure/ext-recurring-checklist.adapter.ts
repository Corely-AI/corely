import { Injectable } from "@nestjs/common";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { ChecklistOccurrenceSchema, type ChecklistOccurrence } from "@corely/contracts";
import { z } from "zod";
import { ChecklistRecordSchema, type ChecklistRecord } from "../domain/recurring-checklist";
import type { TaskScope } from "../application/ports/task-repository.port";
import type { RecurringChecklistRepository } from "../application/ports/recurring-checklist-repository.port";
const keyFor = (scope: TaskScope, kind: string, key: string) => ({
  tenantId: scope.tenantId,
  moduleId: "tasks",
  scope: `workspace:${scope.workspaceId}:recurring-${kind}`,
  key,
});
const replaySchema = z.object({ fingerprint: z.string(), templateId: z.string().uuid() }).strict();
@Injectable()
export class ExtRecurringChecklistAdapter implements RecurringChecklistRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}
  async get(scope: TaskScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "templates", id), tx);
    return row ? ChecklistRecordSchema.parse(row.value) : null;
  }
  async list(scope: TaskScope, tx?: TransactionContext) {
    const key = keyFor(scope, "templates", "");
    const rows = await getPrismaClient(this.prisma, tx).extKv.findMany({
      where: { tenantId: key.tenantId, moduleId: key.moduleId, scope: key.scope },
      orderBy: [{ createdAt: "desc" }, { key: "asc" }],
      select: { value: true },
    });
    return rows.map((row) => ChecklistRecordSchema.parse(row.value));
  }
  async save(scope: TaskScope, template: ChecklistRecord, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "templates", template.id), value: template }, tx);
  }
  async occurrence(scope: TaskScope, templateId: string, date: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, `occurrences:${templateId}`, date), tx);
    return row ? ChecklistOccurrenceSchema.parse(row.value) : null;
  }
  async saveOccurrence(scope: TaskScope, occurrence: ChecklistOccurrence, tx: TransactionContext) {
    await this.kv.set(
      {
        ...keyFor(scope, `occurrences:${occurrence.templateId}`, occurrence.localDate),
        value: occurrence,
      },
      tx
    );
  }
  async recent(scope: TaskScope, templateId: string, tx?: TransactionContext) {
    const key = keyFor(scope, `occurrences:${templateId}`, "");
    const rows = await getPrismaClient(this.prisma, tx).extKv.findMany({
      where: { tenantId: key.tenantId, moduleId: key.moduleId, scope: key.scope },
      orderBy: [{ updatedAt: "desc" }, { key: "desc" }],
      take: 10,
      select: { value: true },
    });
    return rows.map((row) => ChecklistOccurrenceSchema.parse(row.value));
  }
  async replay(scope: TaskScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "commands", key), tx);
    return row
      ? (replaySchema.parse(row.value) as { fingerprint: string; templateId: string })
      : null;
  }
  async saveReplay(
    scope: TaskScope,
    key: string,
    value: { fingerprint: string; templateId: string },
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "commands", key), value }, tx);
  }
  async due(now: Date, limit: number) {
    const rows = await this.prisma.extKv.findMany({
      where: {
        moduleId: "tasks",
        scope: { endsWith: ":recurring-templates" },
        value: { path: ["nextEvaluationAt"], lte: now.toISOString() },
      },
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: Math.min(50, Math.max(1, limit)),
      select: { tenantId: true, scope: true, key: true, value: true },
    });
    return rows.map((row) => {
      const template = ChecklistRecordSchema.parse(row.value);
      if (
        row.scope !== `workspace:${template.workspaceId}:recurring-templates` ||
        row.key !== template.id
      ) {
        throw new Error("Invalid recurring template scope");
      }
      return {
        scope: { tenantId: row.tenantId, workspaceId: template.workspaceId },
        id: template.id,
      };
    });
  }
}
