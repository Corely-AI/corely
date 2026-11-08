import { Inject, Injectable } from "@nestjs/common";
import type { StaffLinkScope } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import {
  STAFF_AVAILABILITY_REPOSITORY,
  type StaffAvailabilityRepository,
} from "./ports/staff-availability.port";
import { staffAvailabilityWindows } from "../domain/staff-availability";

// Operational eligibility only. Raw patterns, exception details and personnel reasons stay in People.
@Injectable()
export class StaffWorkdayLookup {
  constructor(
    @Inject(STAFF_AVAILABILITY_REPOSITORY) private readonly schedules: StaffAvailabilityRepository
  ) {}
  async isAvailable(
    scope: StaffLinkScope,
    staffId: string,
    from: Date,
    to: Date,
    tx: TransactionContext
  ): Promise<boolean> {
    const schedule = await this.schedules.get(scope, staffId, tx);
    // Publishing a future pattern must not retroactively restrict an unconfigured current date.
    if (!schedule.plans.some((plan) => Date.parse(plan.startsAt) < to.getTime())) {
      return true;
    }
    return staffAvailabilityWindows(schedule, from, to).length > 0;
  }
}
