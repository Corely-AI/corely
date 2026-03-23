import {
  AUDIT_PORT,
  BaseUseCase,
  IDEMPOTENCY_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
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
  type BookCoachingEngagementInput,
  type BookCoachingEngagementOutput,
  COACHING_EVENTS,
} from "@corely/contracts";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import { resolveInitialStatus } from "../../domain/coaching-state.machine";
import { toCoachingEngagementDto, toCoachingSessionDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

type Deps = {
  logger: LoggerPort;
  repo: CoachingEngagementRepositoryPort;
  customerQuery: CustomerQueryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  audit: AuditPort;
  outbox: OutboxPort;
  idempotency: IdempotencyPort;
  uow: UnitOfWorkPort;
};

export class BookCoachingEngagementUseCase extends BaseUseCase<
  BookCoachingEngagementInput,
  BookCoachingEngagementOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger, idempotency: deps.idempotency, uow: deps.uow });
  }

  protected getIdempotencyKey(
    input: BookCoachingEngagementInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.workspaceId) {
      return undefined;
    }
    return buildIdempotencyKey("coaching/book", ctx.workspaceId, input.idempotencyKey);
  }

  protected async handle(
    input: BookCoachingEngagementInput,
    ctx: UseCaseContext
  ): Promise<Result<BookCoachingEngagementOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const customer = await this.deps.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      input.clientPartyId
    );
    if (!customer) {
      return err(new ValidationError("clientPartyId must reference an existing customer"));
    }

    const now = this.deps.clock.now();
    const sessionStartAt = new Date(input.session.startAt);
    const sessionEndAt = new Date(input.session.endAt);
    const bufferedStartAt = new Date(
      sessionStartAt.getTime() - input.offer.bookingRules.bufferBeforeMinutes * 60 * 1000
    );
    const bufferedEndAt = new Date(
      sessionEndAt.getTime() + input.offer.bookingRules.bufferAfterMinutes * 60 * 1000
    );

    const [hasSessionConflict, hasHoldConflict] = await Promise.all([
      this.deps.repo.hasCoachSessionConflict(
        ctx.tenantId,
        input.coachUserId,
        bufferedStartAt,
        bufferedEndAt
      ),
      this.deps.repo.hasActiveHoldConflict(
        ctx.tenantId,
        input.coachUserId,
        bufferedStartAt,
        bufferedEndAt,
        now,
        input.bookingHoldId ? { excludeHoldId: input.bookingHoldId } : undefined
      ),
    ]);
    if (hasSessionConflict || hasHoldConflict) {
      return err(new ValidationError("Selected slot is no longer available"));
    }

    const offer = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      coachUserId: input.coachUserId,
      title: input.offer.title,
      description: input.offer.description ?? null,
      currency: input.offer.currency,
      priceCents: input.offer.priceCents,
      sessionDurationMinutes: input.offer.sessionDurationMinutes,
      meetingType: input.offer.meetingType,
      availabilityRule: input.offer.availabilityRule,
      bookingRules: input.offer.bookingRules,
      contractRequired: input.offer.contractRequired,
      paymentRequired: input.offer.paymentRequired,
      localeDefault: input.offer.localeDefault,
      contractTemplate: input.offer.contractTemplate ?? null,
      contractLabel: input.offer.contractLabel ?? null,
      prepFormTemplate: input.offer.prepFormTemplate ?? null,
      prepFormSendHoursBeforeSession: input.offer.prepFormSendHoursBeforeSession ?? null,
      debriefTemplate: input.offer.debriefTemplate ?? null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const engagement = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      offerId: offer.id,
      clientPartyId: input.clientPartyId,
      coachPartyId: input.coachPartyId ?? null,
      coachUserId: input.coachUserId,
      locale: input.locale,
      status: resolveInitialStatus(offer),
      paymentStatus: offer.paymentRequired ? ("pending" as const) : ("not_required" as const),
      contractStatus: offer.contractRequired ? ("pending" as const) : ("not_required" as const),
      legalEntityId: input.legalEntityId ?? null,
      paymentMethodId: input.paymentMethodId ?? null,
      invoiceId: null,
      stripeCheckoutSessionId: null,
      stripeCheckoutUrl: null,
      stripePaymentIntentId: null,
      contractAccessTokenHash: null,
      contractRequestedAt: null,
      contractSignedAt: null,
      contractDraftDocumentId: null,
      signedContractDocumentId: null,
      latestSummary: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const session = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      engagementId: engagement.id,
      status: "scheduled" as const,
      sequenceNo: 1,
      startAt: sessionStartAt,
      endAt: sessionEndAt,
      meetingProvider: input.session.meetingProvider ?? null,
      meetingLink: null,
      meetingIssuedAt: null,
      prepAccessTokenHash: null,
      prepRequestedAt: null,
      prepSubmittedAt: null,
      prepDocumentId: null,
      debriefAccessTokenHash: null,
      debriefRequestedAt: null,
      debriefSubmittedAt: null,
      debriefDocumentId: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.uow!.withinTransaction(async (tx) => {
      await this.deps.repo.createOffer(offer, tx);
      await this.deps.repo.createEngagement(engagement, tx);
      await this.deps.repo.createSession(session, tx);
      await this.deps.repo.createTimelineEntry(
        {
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId!,
          workspaceId: ctx.workspaceId!,
          engagementId: engagement.id,
          eventType: COACHING_EVENTS.BOOKING_REQUESTED,
          stateFrom: null,
          stateTo: engagement.status,
          actorUserId: ctx.userId ?? null,
          metadata: {
            clientPartyId: engagement.clientPartyId,
            coachUserId: engagement.coachUserId,
            offerTitle: offer.title,
          },
          occurredAt: now,
          createdAt: now,
        },
        tx
      );
      await this.deps.audit.log(
        {
          tenantId: ctx.tenantId!,
          userId: ctx.userId ?? "system",
          action: "coaching.engagement.book",
          entityType: "CoachingEngagement",
          entityId: engagement.id,
          metadata: {
            clientPartyId: engagement.clientPartyId,
            coachUserId: engagement.coachUserId,
            sessionId: session.id,
          },
        },
        tx
      );
      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: COACHING_EVENTS.BOOKING_REQUESTED,
          correlationId: ctx.correlationId,
          payload: {
            workspaceId: ctx.workspaceId!,
            engagementId: engagement.id,
            sessionId: session.id,
          },
        },
        tx
      );
    });

    return ok({
      engagement: toCoachingEngagementDto(engagement, offer),
      session: toCoachingSessionDto(session),
    });
  }
}
