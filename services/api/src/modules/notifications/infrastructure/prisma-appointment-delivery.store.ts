import { getPrismaClient, PrismaExtKvAdapter, PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { Injectable } from "@nestjs/common";
import {
  AppointmentDeliveryRecordSchema,
  type AppointmentDeliveryRecord,
  type AppointmentDeliveryScope,
  type AppointmentDeliveryStore,
} from "../application/ports/appointment-delivery.port";

const address = (scope: AppointmentDeliveryScope, id: string) => ({
  tenantId: scope.tenantId,
  moduleId: "notifications",
  scope: `workspace:${scope.workspaceId}`,
  key: `appointment-update:${id}`,
});

@Injectable()
export class PrismaAppointmentDeliveryStore implements AppointmentDeliveryStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}

  async lock(scope: AppointmentDeliveryScope, id: string, tx: TransactionContext) {
    const key = `appointment-update:${scope.tenantId}:${scope.workspaceId}:${id}`;
    await getPrismaClient(this.prisma, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
  }

  async get(scope: AppointmentDeliveryScope, id: string, tx?: TransactionContext) {
    const record = await this.kv.get(address(scope, id), tx);
    return record ? AppointmentDeliveryRecordSchema.parse(record.value) : null;
  }

  async save(
    scope: AppointmentDeliveryScope,
    id: string,
    record: AppointmentDeliveryRecord,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...address(scope, id), value: record }, tx);
  }
}
