import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter } from "@corely/data";
import {
  StaffAvailabilitySchema,
  type StaffAvailability,
  type StaffLinkScope,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { StaffAvailabilityRepository } from "../application/ports/staff-availability.port";
const key = (scope: StaffLinkScope, staffId: string) => ({
  tenantId: scope.tenantId,
  moduleId: "people",
  scope: `workspace:${scope.workspaceId}:availability`,
  key: staffId,
});
@Injectable()
export class ExtStaffAvailabilityAdapter implements StaffAvailabilityRepository {
  constructor(private readonly kv: PrismaExtKvAdapter) {}
  async get(scope: StaffLinkScope, staffId: string, tx?: TransactionContext) {
    const row = await this.kv.get(key(scope, staffId), tx);
    return row ? StaffAvailabilitySchema.parse(row.value) : { version: 0, plans: [] };
  }
  async save(
    scope: StaffLinkScope,
    staffId: string,
    value: StaffAvailability,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...key(scope, staffId), value: StaffAvailabilitySchema.parse(value) }, tx);
  }
}
