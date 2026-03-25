import {
  BaseUseCase,
  ValidationError,
  isErr,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type StartCoachingPublicBookingInput,
  type StartCoachingPublicBookingOutput,
} from "@corely/contracts";
import type { PartyApplication } from "../../../party/application/party.application";
import {
  toCoachingEngagementDto,
  toCoachingPaymentDto,
  toCoachingSessionDto,
} from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import { type CoachingPaymentProviderRegistryPort } from "../ports/coaching-payment-provider.port";
import type { BookCoachingEngagementUseCase } from "./book-coaching-engagement.usecase";
import { createCoachingPaymentSession } from "./coaching-payment-session.helpers";

export class StartCoachingPublicBookingUseCase extends BaseUseCase<
  StartCoachingPublicBookingInput,
  StartCoachingPublicBookingOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      party: PartyApplication;
      bookEngagement: BookCoachingEngagementUseCase;
      paymentProviders: CoachingPaymentProviderRegistryPort;
      idGenerator: IdGeneratorPort;
      clock: ClockPort;
      audit: AuditPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: StartCoachingPublicBookingInput,
    ctx: UseCaseContext
  ): Promise<Result<StartCoachingPublicBookingOutput, UseCaseError>> {
    const offer = await this.deps.repo.findPublicOfferById(input.offerId);
    if (!offer || !offer.workspaceId || !offer.coachUserId) {
      return err(new ValidationError("Offer not available for public booking"));
    }
    if (!offer.paymentRequired) {
      return err(new ValidationError("Offer does not require payment"));
    }

    const hold = await this.deps.repo.findBookingHoldById(offer.tenantId, input.holdId);
    if (!hold || hold.offerId !== offer.id) {
      return err(new ValidationError("Booking hold not found"));
    }

    const now = this.deps.clock.now();
    if (hold.status !== "active" || hold.expiresAt <= now) {
      return err(new ValidationError("Booking hold has expired"));
    }

    const customerResult = await this.deps.party.createCustomer.execute(
      {
        displayName: input.client.displayName,
        email: input.client.email,
        phone: input.client.phone,
      },
      {
        tenantId: offer.tenantId,
        correlationId: ctx.correlationId,
      }
    );
    if (isErr(customerResult)) {
      return customerResult;
    }

    const bookingResult = await this.deps.bookEngagement.execute(
      {
        clientPartyId: customerResult.value.customer.id,
        bookingHoldId: hold.id,
        coachUserId: offer.coachUserId,
        locale: input.locale,
        offer: {
          title: offer.title,
          description: offer.description ?? undefined,
          currency: offer.currency,
          priceCents: offer.priceCents,
          sessionDurationMinutes: offer.sessionDurationMinutes,
          meetingType: offer.meetingType,
          availabilityRule: offer.availabilityRule,
          bookingRules: offer.bookingRules,
          contractRequired: offer.contractRequired,
          paymentRequired: offer.paymentRequired,
          localeDefault: offer.localeDefault,
          contractTemplate: offer.contractTemplate ?? undefined,
          contractLabel: offer.contractLabel ?? undefined,
          prepFormTemplate: offer.prepFormTemplate ?? undefined,
          debriefTemplate: offer.debriefTemplate ?? undefined,
        },
        session: {
          startAt: hold.startAt.toISOString(),
          endAt: hold.endAt.toISOString(),
        },
      },
      {
        tenantId: offer.tenantId,
        workspaceId: offer.workspaceId,
        correlationId: ctx.correlationId,
      }
    );
    if (isErr(bookingResult)) {
      return bookingResult;
    }

    hold.status = "cancelled";
    hold.updatedAt = now;
    await this.deps.repo.updateBookingHold(hold);

    const engagement = await this.deps.repo.findEngagementById(
      offer.tenantId,
      offer.workspaceId,
      bookingResult.value.engagement.id
    );
    if (!engagement) {
      return err(new ValidationError("Booking engagement could not be loaded"));
    }

    const created = await createCoachingPaymentSession({
      repo: this.deps.repo,
      paymentProviders: this.deps.paymentProviders,
      idGenerator: this.deps.idGenerator,
      clock: this.deps.clock,
      engagement,
      offer: engagement.offer,
      sessionId: bookingResult.value.session.id,
      customerEmail: input.client.email,
      paymentProvider: input.paymentProvider,
      successPath: input.successPath,
      cancelPath: input.cancelPath,
    });

    const session = await this.deps.repo.findSessionById(
      offer.tenantId,
      offer.workspaceId,
      bookingResult.value.session.id
    );
    if (!session) {
      return err(new ValidationError("Booked session could not be loaded"));
    }

    await this.deps.audit.log({
      tenantId: offer.tenantId,
      userId: "system",
      action: "coaching.public_booking.started",
      entityType: "CoachingEngagement",
      entityId: engagement.id,
      metadata: {
        holdId: hold.id,
        paymentId: created.payment.id,
        provider: created.payment.provider,
      },
    });

    return ok({
      engagement: toCoachingEngagementDto(created.engagement, engagement.offer),
      session: toCoachingSessionDto(session),
      payment: toCoachingPaymentDto(created.payment),
      checkoutUrl: created.checkoutUrl,
    });
  }
}
