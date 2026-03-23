import { Injectable, Inject } from "@nestjs/common";
import {
  AUDIT_PORT,
  CLOCK_PORT_TOKEN,
  ID_GENERATOR_TOKEN,
  OUTBOX_PORT,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type OutboxPort,
} from "@corely/kernel";
import { COACHING_EVENTS } from "@corely/contracts";
import { resolveGatedStatus } from "../../domain/coaching-state.machine";
import type { CoachingEngagementRecord, CoachingPaymentRecord } from "../../domain/coaching.types";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import {
  type CoachingPaymentProviderRegistryPort,
  type CoachingPaymentProviderWebhookEvent,
} from "../ports/coaching-payment-provider.port";

@Injectable()
export class ProcessCoachingPaymentWebhookUseCase {
  constructor(
    @Inject("coaching-engagements/logger")
    private readonly logger: { info: (...args: any[]) => void },
    @Inject("coaching-engagements/repo")
    private readonly repo: CoachingEngagementRepositoryPort,
    @Inject("coaching-engagements/payment-provider-registry")
    private readonly paymentProviders: CoachingPaymentProviderRegistryPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async execute(providerName: string, rawBody: Buffer, signature?: string): Promise<void> {
    const provider = this.paymentProviders.getByWebhook(providerName);
    const parsed = await provider.verifyAndParseWebhook({ rawBody, signature });

    if (!parsed.tenantId || !parsed.paymentId) {
      this.logger.info("coaching.payment_webhook.ignored", parsed.eventType);
      return;
    }

    const inserted = await this.repo.createProviderEventIfAbsent({
      id: this.idGenerator.newId(),
      tenantId: parsed.tenantId,
      provider: parsed.provider,
      providerEventId: parsed.eventId,
      eventType: parsed.eventType,
      engagementId: parsed.engagementId,
      paymentId: parsed.paymentId,
      payload: this.asRecord(parsed.rawPayload),
      processedAt: this.clock.now(),
      createdAt: this.clock.now(),
    });
    if (!inserted) {
      return;
    }

    const payment = await this.repo.findPaymentById(parsed.tenantId, parsed.paymentId);
    if (!payment) {
      return;
    }

    const engagement = await this.repo.findEngagementById(
      parsed.tenantId,
      payment.workspaceId ?? "",
      payment.engagementId
    );
    if (!engagement) {
      return;
    }

    if (parsed.status === "captured") {
      await this.handleCaptured(parsed.tenantId, engagement, payment, parsed);
      return;
    }

    if (parsed.status === "failed") {
      await this.handleFailed(parsed.tenantId, engagement, payment, parsed);
      return;
    }

    if (parsed.status === "refunded") {
      await this.handleRefunded(parsed.tenantId, engagement, payment, parsed);
    }
  }

  private async handleCaptured(
    tenantId: string,
    engagement: CoachingEngagementRecord & { offer: any },
    payment: CoachingPaymentRecord,
    parsed: CoachingPaymentProviderWebhookEvent
  ) {
    const now = this.clock.now();
    const updatedPayment = await this.repo.updatePayment({
      ...payment,
      status: "captured",
      providerCheckoutSessionId: parsed.checkoutSessionId ?? payment.providerCheckoutSessionId,
      providerPaymentRef: parsed.paymentRef ?? payment.providerPaymentRef,
      failureCode: null,
      failureMessage: null,
      capturedAt: payment.capturedAt ?? now,
      updatedAt: now,
    });

    const previousStatus = engagement.status;
    const updatedEngagement = await this.repo.updateEngagement({
      ...engagement,
      paymentStatus: "captured",
      stripeCheckoutSessionId:
        parsed.provider === "stripe"
          ? parsed.checkoutSessionId ?? engagement.stripeCheckoutSessionId
          : engagement.stripeCheckoutSessionId,
      stripePaymentIntentId:
        parsed.provider === "stripe"
          ? parsed.paymentRef ?? engagement.stripePaymentIntentId
          : engagement.stripePaymentIntentId,
      status: resolveGatedStatus(engagement.offer, {
        paymentStatus: "captured",
        contractStatus: engagement.contractStatus,
        prepRequired: Boolean(engagement.offer.prepFormTemplate),
        prepSubmitted: false,
      }),
      updatedAt: now,
    });

    await this.repo.createTimelineEntry({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId: updatedEngagement.workspaceId,
      engagementId: updatedEngagement.id,
      eventType: COACHING_EVENTS.PAYMENT_CAPTURED,
      stateFrom: previousStatus,
      stateTo: updatedEngagement.status,
      actorUserId: null,
      metadata: {
        paymentId: updatedPayment.id,
        checkoutSessionId: updatedPayment.providerCheckoutSessionId,
        paymentIntentId: updatedPayment.providerPaymentRef,
      },
      occurredAt: now,
      createdAt: now,
    });
    await this.audit.log({
      tenantId,
      userId: "system",
      action: "coaching.payment.captured",
      entityType: "CoachingPayment",
      entityId: updatedPayment.id,
      metadata: { engagementId: updatedEngagement.id },
    });
    await this.outbox.enqueue({
      tenantId,
      eventType: COACHING_EVENTS.PAYMENT_CAPTURED,
      payload: {
        workspaceId: updatedEngagement.workspaceId,
        engagementId: updatedEngagement.id,
        checkoutSessionId: updatedPayment.providerCheckoutSessionId ?? undefined,
      },
    });
  }

  private async handleFailed(
    tenantId: string,
    engagement: CoachingEngagementRecord & { offer: any },
    payment: CoachingPaymentRecord,
    parsed: CoachingPaymentProviderWebhookEvent
  ) {
    const now = this.clock.now();
    const updatedPayment = await this.repo.updatePayment({
      ...payment,
      status: "failed",
      providerPaymentRef: parsed.paymentRef ?? payment.providerPaymentRef,
      failureCode: parsed.failureCode,
      failureMessage: parsed.failureMessage,
      failedAt: payment.failedAt ?? now,
      updatedAt: now,
    });

    const previousStatus = engagement.status;
    const updatedEngagement = await this.repo.updateEngagement({
      ...engagement,
      paymentStatus: "failed",
      status: resolveGatedStatus(engagement.offer, {
        paymentStatus: "failed",
        contractStatus: engagement.contractStatus,
        prepRequired: Boolean(engagement.offer.prepFormTemplate),
        prepSubmitted: false,
      }),
      updatedAt: now,
    });

    if (updatedPayment.sessionId && engagement.workspaceId) {
      const session = await this.repo.findSessionById(
        tenantId,
        engagement.workspaceId,
        updatedPayment.sessionId
      );
      if (session && session.status !== "cancelled") {
        await this.repo.updateSession({
          ...session,
          status: "cancelled",
          updatedAt: now,
        });
      }
    }

    await this.repo.createTimelineEntry({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId: updatedEngagement.workspaceId,
      engagementId: updatedEngagement.id,
      eventType: COACHING_EVENTS.PAYMENT_FAILED,
      stateFrom: previousStatus,
      stateTo: updatedEngagement.status,
      actorUserId: null,
      metadata: {
        paymentId: updatedPayment.id,
        failureCode: updatedPayment.failureCode,
        failureMessage: updatedPayment.failureMessage,
      },
      occurredAt: now,
      createdAt: now,
    });
    await this.audit.log({
      tenantId,
      userId: "system",
      action: "coaching.payment.failed",
      entityType: "CoachingPayment",
      entityId: updatedPayment.id,
      metadata: { engagementId: updatedEngagement.id },
    });
  }

  private async handleRefunded(
    tenantId: string,
    engagement: CoachingEngagementRecord & { offer: any },
    payment: CoachingPaymentRecord,
    parsed: CoachingPaymentProviderWebhookEvent
  ) {
    const now = this.clock.now();
    const updatedPayment = await this.repo.updatePayment({
      ...payment,
      status: "refunded",
      providerPaymentRef: parsed.paymentRef ?? payment.providerPaymentRef,
      providerRefundRef: parsed.refundRef ?? payment.providerRefundRef,
      refundedAmountCents: parsed.refundedAmountCents ?? payment.amountCents,
      refundedAt: payment.refundedAt ?? now,
      updatedAt: now,
    });

    await this.repo.createTimelineEntry({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId: engagement.workspaceId,
      engagementId: engagement.id,
      eventType: COACHING_EVENTS.PAYMENT_REFUNDED,
      stateFrom: engagement.status,
      stateTo: engagement.status,
      actorUserId: null,
      metadata: {
        paymentId: updatedPayment.id,
        refundRef: updatedPayment.providerRefundRef,
        refundedAmountCents: updatedPayment.refundedAmountCents,
      },
      occurredAt: now,
      createdAt: now,
    });
    await this.audit.log({
      tenantId,
      userId: "system",
      action: "coaching.payment.refunded",
      entityType: "CoachingPayment",
      entityId: updatedPayment.id,
      metadata: { engagementId: engagement.id },
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
