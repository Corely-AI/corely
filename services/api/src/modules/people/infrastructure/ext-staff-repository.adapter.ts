import { Injectable } from "@nestjs/common";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import {
  StaffProfileSchema,
  StaffPrivateSchema,
  type StaffProfile,
  type StaffPrivate,
} from "@corely/contracts";
import { z } from "zod";
import type {
  StaffRepositoryPort,
  StaffScope,
  StaffReplay,
} from "../application/ports/staff-repository.port";
const replaySchema = z.object({ fingerprint: z.string(), staffId: z.string() }).strict();
const keyFor = (scope: StaffScope, kind: string, key: string) => ({
  tenantId: scope.tenantId,
  moduleId: "people",
  scope: `workspace:${scope.workspaceId}:${kind}`,
  key,
});
@Injectable()
export class ExtStaffRepositoryAdapter implements StaffRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}
  transaction<T>(scope: StaffScope, work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (client) => {
        // Serialize every People writer in this workspace, including duplicate-link checks.
        await this.lock(scope, client as unknown as TransactionContext);
        return work(client as unknown as TransactionContext);
      },
      { timeout: 15000 }
    );
  }
  async lock(scope: StaffScope, tx: TransactionContext): Promise<void> {
    await getPrismaClient(this.prisma, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["people", scope.tenantId, scope.workspaceId])}, 0))::text`;
  }
  async list(scope: StaffScope, tx?: TransactionContext) {
    const key = keyFor(scope, "profiles", "");
    const filter = { tenantId: key.tenantId, moduleId: key.moduleId, scope: key.scope };
    const rows = await getPrismaClient(this.prisma, tx).extKv.findMany({
      where: filter,
      select: { value: true },
    });
    return rows.map((row) => StaffProfileSchema.parse(row.value));
  }
  async get(scope: StaffScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "profiles", id), tx);
    return row ? StaffProfileSchema.parse(row.value) : null;
  }
  async save(scope: StaffScope, profile: StaffProfile, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "profiles", profile.id), value: profile }, tx);
  }
  async privateGet(scope: StaffScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "private", id), tx);
    return row ? StaffPrivateSchema.parse(row.value) : null;
  }
  async privateSave(scope: StaffScope, id: string, value: StaffPrivate, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "private", id), value }, tx);
  }
  async replay(scope: StaffScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "commands", key), tx);
    return row ? (replaySchema.parse(row.value) as StaffReplay) : null;
  }
  async saveReplay(scope: StaffScope, key: string, replay: StaffReplay, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope, "commands", key), value: replay }, tx);
  }
}
