import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter, PrismaService } from "@corely/data";
import { ProcedureDetailSchema, type PublishedProcedure } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { z } from "zod";
import type { ProcedureRecord } from "../domain/procedure";
import type {
  ProcedureReplay,
  ProcedureRepository,
  ProcedureScope,
} from "../application/ports/procedure-repository.port";

const recordSchema = ProcedureDetailSchema.omit({ canManage: true });
const replaySchema = z.object({ fingerprint: z.string(), procedureId: z.string().uuid() }).strict();
const keyFor = (scope: ProcedureScope, kind: string, key: string) => ({
  tenantId: scope.tenantId,
  moduleId: "knowledge",
  scope: `workspace:${scope.workspaceId}:${kind}`,
  key,
});

@Injectable()
export class ExtProcedureRepository implements ProcedureRepository {
  constructor(
    private readonly db: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}

  transaction<T>(scope: ProcedureScope, work: (tx: TransactionContext) => Promise<T>) {
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["knowledge", scope.tenantId, scope.workspaceId])}, 0))::text`;
        return work(tx as unknown as TransactionContext);
      },
      { timeout: 15000 }
    );
  }

  async list(scope: ProcedureScope) {
    const namespace = keyFor(scope, "procedures", "");
    const rows = await this.db.extKv.findMany({
      where: { tenantId: namespace.tenantId, moduleId: namespace.moduleId, scope: namespace.scope },
      select: { value: true },
    });
    return rows.map((row) => recordSchema.parse(row.value));
  }

  async get(scope: ProcedureScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "procedures", id), tx);
    return row ? recordSchema.parse(row.value) : null;
  }

  async save(scope: ProcedureScope, record: ProcedureRecord, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "procedures", record.id), value: record }, tx);
  }

  async saveVersion(
    scope: ProcedureScope,
    id: string,
    version: PublishedProcedure,
    tx: TransactionContext
  ) {
    await this.kv.set(
      { ...keyFor(scope, `versions:${id}`, String(version.version)), value: version },
      tx
    );
  }

  async getReplay(scope: ProcedureScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "commands", key), tx);
    if (!row) {
      return null;
    }
    const { fingerprint, procedureId } = replaySchema.parse(row.value);
    return { fingerprint, procedureId };
  }

  async saveReplay(
    scope: ProcedureScope,
    key: string,
    replay: ProcedureReplay,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "commands", key), value: replay }, tx);
  }
}
