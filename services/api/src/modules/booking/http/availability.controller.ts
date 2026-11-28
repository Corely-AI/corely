import { Controller, Get, Put, Body, Param, Req, Query, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RequireTenant } from "@corely/kernel";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";

import { UpsertAvailabilityRuleUseCase } from "../application/use-cases/upsert-availability-rule.usecase";
import { GetAvailabilityUseCase } from "../application/use-cases/get-availability.usecase";
import type { WeeklyScheduleSlot } from "../domain/booking.entities";

import { UpsertAvailabilityRuleInputSchema, GetAvailabilityInputSchema } from "@corely/contracts";

@Controller("booking/availability")
@UseGuards(AuthGuard)
@RequireTenant()
export class BookingAvailabilityController {
  constructor(
    private readonly upsertRule: UpsertAvailabilityRuleUseCase,
    private readonly getAvailability: GetAvailabilityUseCase
  ) {}

  @Put(":resourceId")
  async upsert(
    @Req() req: Request,
    @Param("resourceId") resourceId: string,
    @Body() body: unknown
  ) {
    const parsedBody = UpsertAvailabilityRuleInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const effectiveFrom = parsedBody.effectiveFrom ? new Date(parsedBody.effectiveFrom) : null;
    const effectiveTo = parsedBody.effectiveTo ? new Date(parsedBody.effectiveTo) : null;
    const blackouts = parsedBody.blackouts.map(({ startAt, endAt, reason }) => ({
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      reason,
    }));

    const rule = await this.upsertRule.execute(
      {
        resourceId,
        timezone: parsedBody.timezone ?? "UTC",
        weeklySlots: parsedBody.weeklySlots as WeeklyScheduleSlot[],
        effectiveFrom,
        effectiveTo,
        blackouts,
      },
      ctx
    );
    return { rule };
  }

  @Get()
  async get(@Req() req: Request, @Query() query: unknown) {
    const parsedQuery = GetAvailabilityInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const result = await this.getAvailability.execute(
      {
        resourceId: parsedQuery.resourceId,
        from: new Date(parsedQuery.from),
        to: new Date(parsedQuery.to),
      },
      ctx
    );
    return result;
  }
}
