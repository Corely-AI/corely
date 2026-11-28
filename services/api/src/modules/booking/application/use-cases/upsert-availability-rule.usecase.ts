import type { UnitOfWorkPort, UseCaseContext } from "@corely/kernel";
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
    private readonly idGenerator: IdGeneratorPort,
    private readonly unitOfWork: UnitOfWorkPort
  ) {}

  async execute(input: UpsertAvailabilityRuleInput, ctx: UseCaseContext) {
    const tenantId = ctx.tenantId!;
    return this.unitOfWork.withinTransaction(async (tx) => {
      await this.ruleRepo.lockResource(tenantId, input.resourceId, tx);
      const resource = await this.resourceRepo.findById(input.resourceId, tenantId, tx);
      if (
        !resource ||
        (resource.workspaceId !== null && resource.workspaceId !== ctx.workspaceId)
      ) {
        throw new NotFoundException(`Resource ${input.resourceId} not found`);
      }

      const current = await this.ruleRepo.findByResourceId(input.resourceId, tenantId, tx);
      const now = this.clock.now();
      const rule = new AvailabilityRule(
        current?.id ?? this.idGenerator.newId(),
        tenantId,
        input.resourceId,
        input.timezone,
        input.weeklySlots,
        input.blackouts,
        input.effectiveFrom ?? null,
        input.effectiveTo ?? null,
        current?.createdAt ?? now,
        now
      );
      const saved = await this.ruleRepo.upsert(rule, tx);
      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "booking.availability.upserted",
          entityType: "BookingResource",
          entityId: input.resourceId,
          metadata: { timezone: input.timezone, slotsCount: input.weeklySlots.length },
        },
        tx
      );
      return saved;
    });
  }
}
