import { getPrismaClient, PrismaExtKvAdapter, PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { Injectable } from "@nestjs/common";
import {
  AppointmentReviewRecordSchema,
  type AppointmentReviewRecord,
  type AppointmentReviewStore,
  type ReviewScope,
} from "../../application/ports/appointment-review.port";

const address = (scope: ReviewScope, id: string) => ({
  tenantId: scope.tenantId,
  moduleId: "approvals",
  scope: `workspace:${scope.workspaceId}`,
  key: `appointment-review:${id}`,
});

@Injectable()
export class PrismaAppointmentReviewStore implements AppointmentReviewStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}

  async get(scope: ReviewScope, id: string, tx?: TransactionContext) {
    const row = await this.kv.get(address(scope, id), tx);
    return row ? AppointmentReviewRecordSchema.parse(row.value) : null;
  }

  async lock(scope: ReviewScope, id: string, tx: TransactionContext) {
    const key = `appointment-review:${scope.tenantId}:${scope.workspaceId}:${id}`;
    await getPrismaClient(this.prisma, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
  }

  async save(
    scope: ReviewScope,
    id: string,
    record: AppointmentReviewRecord,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...address(scope, id), value: record }, tx);
  }

  async attempt<T>(tx: TransactionContext, run: () => Promise<T>) {
    const client = getPrismaClient(this.prisma, tx);
    await client.$executeRaw`SAVEPOINT appointment_review_apply`;
    try {
      const value = await run();
      await client.$executeRaw`RELEASE SAVEPOINT appointment_review_apply`;
      return { ok: true as const, value };
    } catch (error: unknown) {
      await client.$executeRaw`ROLLBACK TO SAVEPOINT appointment_review_apply`;
      await client.$executeRaw`RELEASE SAVEPOINT appointment_review_apply`;
      return { ok: false as const, error };
    }
  }
}
