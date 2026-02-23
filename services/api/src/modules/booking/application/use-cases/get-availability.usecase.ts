import type { UseCaseContext } from "@corely/kernel";
import type {
  AvailabilityRuleRepositoryPort,
  ResourceRepositoryPort,
  BookingRepositoryPort,
} from "../ports/booking-repo.ports";
import type { AvailableSlot } from "@corely/contracts";

export class GetAvailabilityUseCase {
  constructor(
    private readonly ruleRepo: AvailabilityRuleRepositoryPort,
    private readonly bookingRepo: BookingRepositoryPort,
    private readonly resourceRepo: ResourceRepositoryPort
  ) {}

  async execute(
    input: { resourceId: string; from: Date; to: Date },
    ctx: UseCaseContext
  ): Promise<{ slots: AvailableSlot[]; rule: any }> {
    const tenantId = ctx.tenantId!;
    const rule = await this.ruleRepo.findByResourceId(input.resourceId, tenantId);

    // Simplistic availability algorithm MVP:
    // Ideally we'd intersect weekly rule slots with blackouts and existing bookings.
    // For this scan-and-return, we'll return a stub. Proper implementation would:
    // 1. Generate theoretical slots based on WeeklySchedule
    // 2. Subtract BlackoutIntervals
    // 3. Find existing CONFIRMED/HOLD allocations in this date range and subtract them
    // 4. Yield resulting slots

    return {
      slots: [], // In full implementation, return generated slots array
      rule: rule ?? null,
    };
  }
}
