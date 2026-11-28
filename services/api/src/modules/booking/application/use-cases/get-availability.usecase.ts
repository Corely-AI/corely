import type { UseCaseContext } from "@corely/kernel";
import type {
  AvailabilityRuleRepositoryPort,
  ResourceRepositoryPort,
} from "../ports/booking-repo.ports";
import type { AvailableSlot } from "@corely/contracts";
import type { AvailabilityRule } from "../../domain/booking.entities";

export class GetAvailabilityUseCase {
  constructor(
    private readonly ruleRepo: AvailabilityRuleRepositoryPort,
    private readonly resourceRepo: ResourceRepositoryPort
  ) {}

  async execute(
    input: { resourceId: string; from: Date; to: Date },
    ctx: UseCaseContext
  ): Promise<{ slots: AvailableSlot[]; rule: AvailabilityRule | null }> {
    const tenantId = ctx.tenantId!;
    const resource = await this.resourceRepo.findById(input.resourceId, tenantId);
    if (!resource || (resource.workspaceId !== null && resource.workspaceId !== ctx.workspaceId)) {
      return { slots: [], rule: null };
    }
    const rule = await this.ruleRepo.findByResourceId(input.resourceId, tenantId);

    // This legacy management read exposes the rule. OpenBuk calculates bookable slots.
    return { slots: [], rule };
  }
}
