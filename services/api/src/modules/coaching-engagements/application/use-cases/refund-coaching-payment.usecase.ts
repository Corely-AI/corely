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
  COACHING_EVENTS,
  type RefundCoachingPaymentInput,
  type RefundCoachingPaymentOutput,
} from "@corely/contracts";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { toCoachingPaymentDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import { type CoachingPaymentProviderRegistryPort } from "../ports/coaching-payment-provider.port";

export class RefundCoachingPaymentUseCase extends BaseUseCase<
  RefundCoachingPaymentInput,
  RefundCoachingPaymentOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      paymentProviders: CoachingPaymentProviderRegistryPort;
      idGenerator: IdGeneratorPort;
      clock: ClockPort;
      audit: AuditPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: RefundCoachingPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RefundCoachingPaymentOutput, UseCaseError>> {
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

    const payment = input.paymentId
      ? await this.deps.repo.findPaymentById(ctx.tenantId, input.paymentId)
      : await this.deps.repo.findLatestPaymentByEngagement(ctx.tenantId, engagement.id);

    if (!payment || payment.engagementId !== engagement.id) {
      return err(new ValidationError("Payment not found"));
    }
    if (payment.status !== "captured" || !payment.providerPaymentRef) {
      return err(new ConflictError("Only captured payments can be refunded"));
    }

    const provider = this.deps.paymentProviders.get(payment.provider);
    const refund = await provider.refundPayment({
      paymentRef: payment.providerPaymentRef,
      amountCents: input.amountCents,
      reason: input.reason,
    });

    const now = this.deps.clock.now();
    const refundedAmountCents =
      refund.refundedAmountCents ?? input.amountCents ?? payment.amountCents;
    const updatedPayment = await this.deps.repo.updatePayment({
      ...payment,
      status: "refunded",
      refundedAmountCents,
      providerRefundRef: refund.refundRef,
      refundedAt: now,
      updatedAt: now,
    });

    await this.deps.repo.createTimelineEntry({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: engagement.workspaceId,
      engagementId: engagement.id,
      eventType: COACHING_EVENTS.PAYMENT_REFUNDED,
      stateFrom: engagement.status,
      stateTo: engagement.status,
      actorUserId: ctx.userId ?? null,
      metadata: {
        paymentId: updatedPayment.id,
        refundRef: updatedPayment.providerRefundRef,
        refundedAmountCents: updatedPayment.refundedAmountCents,
      },
      occurredAt: now,
      createdAt: now,
    });
    await this.deps.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId ?? "system",
      action: "coaching.payment.refunded",
      entityType: "CoachingPayment",
      entityId: updatedPayment.id,
      metadata: {
        engagementId: engagement.id,
        refundRef: updatedPayment.providerRefundRef,
      },
    });

    return ok({ payment: toCoachingPaymentDto(updatedPayment) });
  }
}
