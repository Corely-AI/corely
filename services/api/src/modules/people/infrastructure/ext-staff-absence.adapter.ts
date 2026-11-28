import { Injectable } from "@nestjs/common";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import { StaffAbsenceSchema, type StaffAbsence, type StaffLinkScope } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { z } from "zod";
import type {
  StaffAbsenceRepository,
  AbsenceReplay,
} from "../application/ports/staff-absence.port";
const keyFor = (scope: StaffLinkScope, kind: string, key: string) => ({
  tenantId: scope.tenantId,
  moduleId: "people",
  scope: `workspace:${scope.workspaceId}:${kind}`,
  key,
});
const replaySchema = z
  .object({ fingerprint: z.string(), absenceId: z.string(), documentId: z.string().optional() })
  .strict();
@Injectable()
export class ExtStaffAbsenceAdapter implements StaffAbsenceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}
  async list(scope: StaffLinkScope, staffId: string, tx?: TransactionContext) {
    const key = keyFor(scope, "absences", "");
    const rows = await getPrismaClient(this.prisma, tx).extKv.findMany({
      where: {
        tenantId: key.tenantId,
        moduleId: key.moduleId,
        scope: key.scope,
        value: { path: ["staffId"], equals: staffId },
      },
      select: { value: true },
    });
    return rows.map((row) => StaffAbsenceSchema.parse(row.value));
  }
  async get(scope: StaffLinkScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "absences", id), tx);
    return row ? StaffAbsenceSchema.parse(row.value) : null;
  }
  async save(scope: StaffLinkScope, record: StaffAbsence, tx: TransactionContext) {
    await this.kv.set(
      { ...keyFor(scope, "absences", record.id), value: StaffAbsenceSchema.parse(record) },
      tx
    );
  }
  async replay(scope: StaffLinkScope, key: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(scope, "absence-commands", key), tx);
    return row ? (replaySchema.parse(row.value) as AbsenceReplay) : null;
  }
  async saveReplay(
    scope: StaffLinkScope,
    key: string,
    value: AbsenceReplay,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...keyFor(scope, "absence-commands", key), value }, tx);
  }
}
