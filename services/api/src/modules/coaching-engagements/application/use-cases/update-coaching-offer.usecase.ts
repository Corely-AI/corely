import {
  BaseUseCase,
  NotFoundError,
  ValidationError,
  type AuditPort,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  COACHING_EVENTS,
  type UpdateCoachingOfferInput,
  type UpdateCoachingOfferOutput,
} from "@corely/contracts";
import { toCoachingOfferDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class UpdateCoachingOfferUseCase extends BaseUseCase<
  UpdateCoachingOfferInput & { offerId: string },
  UpdateCoachingOfferOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      clock: ClockPort;
      audit: AuditPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateCoachingOfferInput & { offerId: string },
    ctx: UseCaseContext
  ): Promise<Result<UpdateCoachingOfferOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      return err(new ValidationError("tenantId, workspaceId, and userId are required"));
    }

    const current = await this.deps.repo.findOfferById(ctx.tenantId, ctx.workspaceId, input.offerId);
    if (!current) {
      return err(new NotFoundError("Coaching offer not found"));
    }

    const updated = {
      ...current,
      title: input.title ?? current.title,
      description:
        input.description !== undefined ? (input.description ?? null) : current.description,
      currency: input.currency ?? current.currency,
      priceCents: input.priceCents ?? current.priceCents,
      sessionDurationMinutes: input.sessionDurationMinutes ?? current.sessionDurationMinutes,
      meetingType: input.meetingType ?? current.meetingType,
      availabilityRule: input.availabilityRule ?? current.availabilityRule,
      bookingRules: input.bookingRules ?? current.bookingRules,
      contractRequired: input.contractRequired ?? current.contractRequired,
      paymentRequired: input.paymentRequired ?? current.paymentRequired,
      localeDefault: input.localeDefault ?? current.localeDefault,
      contractTemplate:
        input.contractTemplate !== undefined ? (input.contractTemplate ?? null) : current.contractTemplate,
      contractLabel:
        input.contractLabel !== undefined ? (input.contractLabel ?? null) : current.contractLabel,
      prepFormTemplate:
        input.prepFormTemplate !== undefined
          ? (input.prepFormTemplate ?? null)
          : current.prepFormTemplate,
      prepFormSendHoursBeforeSession:
        input.prepFormSendHoursBeforeSession !== undefined
          ? (input.prepFormSendHoursBeforeSession ?? null)
          : current.prepFormSendHoursBeforeSession,
      debriefTemplate:
        input.debriefTemplate !== undefined
          ? (input.debriefTemplate ?? null)
          : current.debriefTemplate,
      updatedAt: this.deps.clock.now(),
    };

    const persisted = await this.deps.repo.updateOffer(updated);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "coaching.offer.update",
      entityType: "CoachingOffer",
      entityId: persisted.id,
      metadata: {
        eventType: COACHING_EVENTS.OFFER_UPDATED,
      },
    });

    return ok({ offer: toCoachingOfferDto(persisted) });
  }
}
