import {
  BaseUseCase,
  ValidationError,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type IdempotencyPort,
  type LoggerPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  buildIdempotencyKey,
  err,
  ok,
} from "@corely/kernel";
import {
  COACHING_EVENTS,
  type CreateCoachingOfferInput,
  type CreateCoachingOfferOutput,
} from "@corely/contracts";
import { toCoachingOfferDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

type Deps = {
  logger: LoggerPort;
  repo: CoachingEngagementRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  audit: AuditPort;
  outbox: OutboxPort;
  idempotency: IdempotencyPort;
  uow: UnitOfWorkPort;
};

export class CreateCoachingOfferUseCase extends BaseUseCase<
  CreateCoachingOfferInput,
  CreateCoachingOfferOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency, uow: deps.uow });
  }

  protected getIdempotencyKey(input: CreateCoachingOfferInput, ctx: UseCaseContext) {
    if (!ctx.workspaceId || !(input as { idempotencyKey?: string }).idempotencyKey) {
      return undefined;
    }

    return buildIdempotencyKey(
      "coaching/offer-create",
      ctx.workspaceId,
      (input as { idempotencyKey?: string }).idempotencyKey!
    );
  }

  protected async handle(
    input: CreateCoachingOfferInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCoachingOfferOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      return err(new ValidationError("tenantId, workspaceId, and userId are required"));
    }

    const now = this.deps.clock.now();
    const offer = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      coachUserId: ctx.userId,
      title: input.title,
      description: input.description ?? null,
      currency: input.currency,
      priceCents: input.priceCents,
      sessionDurationMinutes: input.sessionDurationMinutes,
      meetingType: input.meetingType,
      availabilityRule: input.availabilityRule,
      bookingRules: input.bookingRules,
      contractRequired: input.contractRequired,
      paymentRequired: input.paymentRequired,
      localeDefault: input.localeDefault,
      contractTemplate: input.contractTemplate ?? null,
      contractLabel: input.contractLabel ?? null,
      prepFormTemplate: input.prepFormTemplate ?? null,
      prepFormSendHoursBeforeSession: input.prepFormSendHoursBeforeSession ?? null,
      debriefTemplate: input.debriefTemplate ?? null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.uow!.withinTransaction(async (tx) => {
      await this.deps.repo.createOffer(offer, tx);
      await this.deps.audit.log(
        {
          tenantId: ctx.tenantId!,
          userId: ctx.userId!,
          action: "coaching.offer.create",
          entityType: "CoachingOffer",
          entityId: offer.id,
          metadata: {
            meetingType: offer.meetingType,
            timezone: offer.availabilityRule.timezone,
          },
        },
        tx
      );
      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: COACHING_EVENTS.OFFER_CREATED,
          correlationId: ctx.correlationId,
          payload: {
            workspaceId: ctx.workspaceId!,
            offerId: offer.id,
          },
        },
        tx
      );
    });

    return ok({ offer: toCoachingOfferDto(offer) });
  }
}
