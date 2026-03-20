import {
  AUDIT_PORT,
  BaseUseCase,
  ConflictError,
  ForbiddenError,
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
  type CreateCoachingCheckoutSessionInput,
  type CreateCoachingCheckoutSessionOutput,
} from "@corely/contracts";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { resolveLocalizedText } from "../../domain/coaching-localization";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import { type CoachingPaymentGatewayPort } from "../ports/coaching-payment-gateway.port";

export class CreateCoachingCheckoutSessionUseCase extends BaseUseCase<
  CreateCoachingCheckoutSessionInput,
  CreateCoachingCheckoutSessionOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      paymentGateway: CoachingPaymentGatewayPort;
      customerQuery: CustomerQueryPort;
      clock: ClockPort;
      audit: AuditPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateCoachingCheckoutSessionInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCoachingCheckoutSessionOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const engagement = await this.deps.repo.findEngagementById(
      ctx.tenantId,
      ctx.workspaceId,
      input.engagementId
    );
    if (!engagement) {
      return err(new ValidationError("Engagement not found"));
    }
    if (!canManageEngagement(engagement, { userId: ctx.userId, roles: ctx.roles })) {
      return err(new ForbiddenError("Not authorized to manage this engagement"));
    }
    if (!engagement.offer.paymentRequired) {
      return err(new ConflictError("This engagement does not require payment"));
    }
    if (engagement.paymentStatus === "captured") {
      return err(new ConflictError("Payment already captured"));
    }

    const customer = await this.deps.customerQuery.getCustomerBillingSnapshot(
      ctx.tenantId,
      engagement.clientPartyId
    );

    const session = await this.deps.paymentGateway.createCheckoutSession({
      tenantId: ctx.tenantId,
      engagementId: engagement.id,
      title: resolveLocalizedText(
        engagement.offer.title,
        engagement.locale,
        engagement.offer.localeDefault
      ),
      description: engagement.offer.description
        ? resolveLocalizedText(
            engagement.offer.description,
            engagement.locale,
            engagement.offer.localeDefault
          )
        : null,
      amountCents: engagement.offer.priceCents,
      currency: engagement.offer.currency,
      customerEmail: customer?.email ?? null,
      successPath: input.successPath,
      cancelPath: input.cancelPath,
    });

    engagement.stripeCheckoutSessionId = session.sessionId;
    engagement.stripeCheckoutUrl = session.checkoutUrl;
    engagement.updatedAt = this.deps.clock.now();
    await this.deps.repo.updateEngagement(engagement);
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "coaching.checkout.create",
      entityType: "CoachingEngagement",
      entityId: engagement.id,
      metadata: { checkoutSessionId: session.sessionId },
    });

    return ok({ checkoutUrl: session.checkoutUrl, sessionId: session.sessionId });
  }
}
