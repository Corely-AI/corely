import type { UseCaseContext } from "@corely/kernel";
import type {
  AvailabilityRuleRepositoryPort,
  ResourceRepositoryPort,
} from "../ports/booking-repo.ports";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import {
  AvailabilityRule,
  type WeeklyScheduleSlot,
  type BlackoutInterval,
} from "../../domain/booking.entities";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { NotFoundException } from "@nestjs/common";

export interface UpsertAvailabilityRuleInput {
  resourceId: string;
  timezone: string;
  weeklySlots: WeeklyScheduleSlot[];
  blackouts: BlackoutInterval[];
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
}

export class UpsertAvailabilityRuleUseCase {
  constructor(
    private readonly ruleRepo: AvailabilityRuleRepositoryPort,
    private readonly resourceRepo: ResourceRepositoryPort,
    private readonly audit: AuditPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(input: UpsertAvailabilityRuleInput, ctx: UseCaseContext) {
    const tenantId = ctx.tenantId!;
    const now = this.clock.now();

    const resource = await this.resourceRepo.findById(input.resourceId, tenantId);
    if (!resource) {
      throw new NotFoundException(`Resource ${input.resourceId} not found`);
    }

    let rule = await this.ruleRepo.findByResourceId(input.resourceId, tenantId);

    if (rule) {
      rule.timezone = input.timezone;
      rule.weeklySlots = input.weeklySlots;
      rule.blackouts = input.blackouts;
      rule.effectiveFrom = input.effectiveFrom ?? null;
      rule.effectiveTo = input.effectiveTo ?? null;
      rule.updatedAt = now;
    } else {
      rule = new AvailabilityRule(
        this.idGenerator.newId(),
        tenantId,
        input.resourceId,
        input.timezone,
        input.weeklySlots,
        input.blackouts,
        input.effectiveFrom ?? null,
        input.effectiveTo ?? null,
        now,
        now
      );
    }

    rule = await this.ruleRepo.upsert(rule);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "booking.availability.upserted",
      entityType: "BookingResource", // Logged against resource
      entityId: input.resourceId,
      metadata: { timezone: input.timezone, slotsCount: input.weeklySlots.length },
    });

    return rule;
  }
}
