import {
  BaseUseCase,
  ConflictError,
  ForbiddenError,
  ValidationError,
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
  type CreateCoachingCheckoutSessionInput,
  type CreateCoachingCheckoutSessionOutput,
} from "@corely/contracts";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { toCoachingPaymentDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import { type CoachingPaymentProviderRegistryPort } from "../ports/coaching-payment-provider.port";
import { createCoachingPaymentSession } from "./coaching-payment-session.helpers";

export class CreateCoachingCheckoutSessionUseCase extends BaseUseCase<
  CreateCoachingCheckoutSessionInput,
  CreateCoachingCheckoutSessionOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      paymentProviders: CoachingPaymentProviderRegistryPort;
      customerQuery: CustomerQueryPort;
      idGenerator: IdGeneratorPort;
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
    const latestPayment = await this.deps.repo.findLatestPaymentByEngagement(
      ctx.tenantId,
      engagement.id
    );

    if (latestPayment?.status === "pending") {
      if (!latestPayment.providerCheckoutUrl || !latestPayment.providerCheckoutSessionId) {
        return err(new ConflictError("Pending payment session is incomplete"));
      }
      return ok({
        checkoutUrl: latestPayment.providerCheckoutUrl,
        sessionId: latestPayment.providerCheckoutSessionId,
        payment: toCoachingPaymentDto(latestPayment),
      });
    }

    const created = await createCoachingPaymentSession({
      repo: this.deps.repo,
      paymentProviders: this.deps.paymentProviders,
      idGenerator: this.deps.idGenerator,
      clock: this.deps.clock,
      engagement,
      offer: engagement.offer,
      customerEmail: customer?.email ?? null,
      paymentProvider: input.paymentProvider,
      successPath: input.successPath,
      cancelPath: input.cancelPath,
    });

    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "coaching.checkout.create",
      entityType: "CoachingEngagement",
      entityId: engagement.id,
      metadata: {
        checkoutSessionId: created.sessionId,
        paymentId: created.payment.id,
        provider: created.payment.provider,
      },
    });

    return ok({
      checkoutUrl: created.checkoutUrl,
      sessionId: created.sessionId,
      payment: toCoachingPaymentDto(created.payment),
    });
  }
}
