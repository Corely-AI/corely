import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter } from "@corely/data";
import { StaffLifecycleRecordSchema, type StaffLifecycleRecord } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { z } from "zod";
import type { StaffLifecycleRepository } from "../application/ports/staff-lifecycle.port";
import type { StaffScope } from "../application/ports/staff-repository.port";
const replay = z.object({ fingerprint: z.string(), staffId: z.string() }).strict();
const keyFor = (scope: StaffScope, kind: string, key: string) => ({
  tenantId: scope.tenantId,
  moduleId: "people",
  scope: `workspace:${scope.workspaceId}:staff-lifecycle-${kind}`,
  key,
});
@Injectable()
export class ExtStaffLifecycleAdapter implements StaffLifecycleRepository {
  constructor(private readonly kv: PrismaExtKvAdapter) {}
  async get(scope: StaffScope, staffId: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "records", staffId), tx);
    return StaffLifecycleRecordSchema.parse(row?.value ?? {});
  }
  async save(
    scope: StaffScope,
    staffId: string,
    record: StaffLifecycleRecord,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "records", staffId), value: record }, tx);
  }
  async replay(scope: StaffScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "commands", key), tx);
    return row ? (replay.parse(row.value) as { fingerprint: string; staffId: string }) : null;
  }
  async saveReplay(
    scope: StaffScope,
    key: string,
    value: { fingerprint: string; staffId: string },
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "commands", key), value }, tx);
  }
}
