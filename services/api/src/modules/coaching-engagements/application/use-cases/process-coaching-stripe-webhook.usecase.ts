import { Injectable } from "@nestjs/common";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type ClockPort,
  type OutboxPort,
} from "@corely/kernel";
import { COACHING_EVENTS } from "@corely/contracts";
import { Inject } from "@nestjs/common";
import { CLOCK_PORT_TOKEN, ID_GENERATOR_TOKEN, type IdGeneratorPort } from "@corely/kernel";
import { resolveGatedStatus } from "../../domain/coaching-state.machine";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import { type CoachingPaymentGatewayPort } from "../ports/coaching-payment-gateway.port";

@Injectable()
export class ProcessCoachingStripeWebhookUseCase {
  constructor(
    @Inject("coaching-engagements/logger")
    private readonly logger: { info: (...args: any[]) => void },
    @Inject("coaching-engagements/repo")
    private readonly repo: CoachingEngagementRepositoryPort,
    @Inject("coaching-engagements/payment-gateway")
    private readonly gateway: CoachingPaymentGatewayPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async execute(rawBody: Buffer, signature?: string): Promise<void> {
    const parsed = await this.gateway.verifyWebhook({ rawBody, signature });

    if (parsed.type !== "checkout.session.completed" || !parsed.checkoutSessionId) {
      this.logger.info("coaching.webhook.ignored", parsed.type);
      return;
    }

    const tenantId = parsed.metadata.tenantId;
    if (!tenantId) {
      return;
    }

    const engagement = await this.repo.findEngagementByCheckoutSessionId(
      tenantId,
      parsed.checkoutSessionId
    );
    if (!engagement || engagement.paymentStatus === "captured") {
      return;
    }

    const previousStatus = engagement.status;
    engagement.paymentStatus = "captured";
    engagement.stripePaymentIntentId = parsed.paymentIntentId ?? engagement.stripePaymentIntentId;
    engagement.status = resolveGatedStatus(engagement.offer, {
      paymentStatus: engagement.paymentStatus,
      contractStatus: engagement.contractStatus,
      prepRequired: Boolean(engagement.offer.prepFormTemplate),
      prepSubmitted: false,
    });
    engagement.updatedAt = this.clock.now();

    await this.repo.updateEngagement(engagement);
    await this.repo.createTimelineEntry({
      id: this.idGenerator.newId(),
      tenantId,
      workspaceId: engagement.workspaceId,
      engagementId: engagement.id,
      eventType: COACHING_EVENTS.PAYMENT_CAPTURED,
      stateFrom: previousStatus,
      stateTo: engagement.status,
      actorUserId: null,
      metadata: {
        checkoutSessionId: parsed.checkoutSessionId,
        paymentIntentId: parsed.paymentIntentId,
      },
      occurredAt: engagement.updatedAt,
      createdAt: engagement.updatedAt,
    });
    await this.audit.log({
      tenantId,
      userId: "system",
      action: "coaching.payment.captured",
      entityType: "CoachingEngagement",
      entityId: engagement.id,
      metadata: { checkoutSessionId: parsed.checkoutSessionId },
    });
    await this.outbox.enqueue({
      tenantId,
      eventType: COACHING_EVENTS.PAYMENT_CAPTURED,
      payload: {
        workspaceId: engagement.workspaceId,
        engagementId: engagement.id,
        checkoutSessionId: parsed.checkoutSessionId,
      },
    });
  }
}
