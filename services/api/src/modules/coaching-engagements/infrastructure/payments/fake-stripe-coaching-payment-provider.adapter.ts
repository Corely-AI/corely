import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { EnvService } from "@corely/config";
import {
  type CoachingPaymentProviderOperation,
  type CoachingPaymentProviderPort,
  type CoachingPaymentProviderTestHooksPort,
  type CoachingPaymentProviderWebhookEvent,
} from "../../application/ports/coaching-payment-provider.port";

type FakeStripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

@Injectable()
export class FakeStripeCoachingPaymentProviderAdapter
  implements CoachingPaymentProviderPort, CoachingPaymentProviderTestHooksPort
{
  readonly providerName = "stripe";

  private checkoutSequence = 0;
  private refundSequence = 0;
  private readonly failNextOperations = new Set<CoachingPaymentProviderOperation>();

  constructor(private readonly env: EnvService) {}

  reset(): void {
    this.checkoutSequence = 0;
    this.refundSequence = 0;
    this.failNextOperations.clear();
  }

  failNext(operation: CoachingPaymentProviderOperation): void {
    this.failNextOperations.add(operation);
  }

  async createCheckoutSession(input: {
    tenantId: string;
    engagementId: string;
    paymentId: string;
    title: string;
    description?: string | null;
    amountCents: number;
    currency: string;
    customerEmail?: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ checkoutSessionId: string; checkoutUrl: string }> {
    this.maybeFail("checkout", `Fake Stripe checkout failed for ${input.engagementId}`);
    const checkoutSessionId = `cs_fake_${++this.checkoutSequence}`;
    return {
      checkoutSessionId,
      checkoutUrl:
        `https://checkout.fake.corely.test/${checkoutSessionId}` +
        `?engagement=${encodeURIComponent(input.engagementId)}` +
        `&payment=${encodeURIComponent(input.paymentId)}`,
    };
  }

  async refundPayment(input: {
    paymentRef: string;
    amountCents?: number;
    reason?: string;
  }): Promise<{ refundRef: string; refundedAmountCents: number | null }> {
    this.maybeFail("refund", `Fake Stripe refund failed for ${input.paymentRef}`);
    return {
      refundRef: `re_fake_${++this.refundSequence}`,
      refundedAmountCents: input.amountCents ?? null,
    };
  }

  async verifyAndParseWebhook(input: {
    rawBody: Buffer;
    signature?: string;
  }): Promise<CoachingPaymentProviderWebhookEvent> {
    const secret = this.webhookSecret();
    if (!input.signature) {
      throw new UnauthorizedException("Missing Stripe webhook signature");
    }

    const expected = createHmac("sha256", secret).update(input.rawBody).digest("hex");
    const actual = this.extractSignature(input.signature);
    if (!actual || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
      throw new UnauthorizedException("Invalid Stripe webhook signature");
    }

    const event = JSON.parse(input.rawBody.toString("utf8")) as FakeStripeEvent;
    const object = event.data?.object ?? {};
    const metadata = this.asRecord(object.metadata);

    return {
      provider: this.providerName,
      eventId: event.id,
      eventType: event.type,
      tenantId: this.pickString(metadata.tenantId),
      engagementId: this.pickString(metadata.engagementId),
      paymentId: this.pickString(metadata.paymentId),
      checkoutSessionId:
        event.type.startsWith("checkout.session") ? this.pickString(object.id) : null,
      paymentRef:
        this.pickString(object.payment_intent) ??
        this.pickString(object.paymentIntentId) ??
        (event.type.startsWith("payment_intent.") ? this.pickString(object.id) : null),
      refundRef: this.pickString(object.refund) ?? this.pickString(object.refundId),
      status: this.mapStatus(event.type),
      failureCode: this.pickString(object.failure_code) ?? this.pickString(object.failureCode),
      failureMessage:
        this.pickString(object.failure_message) ?? this.pickString(object.failureMessage),
      refundedAmountCents: this.pickNumber(object.amount_refunded) ?? this.pickNumber(object.amountRefunded),
      rawPayload: event,
    };
  }

  private webhookSecret(): string {
    return this.env.STRIPE_WEBHOOK_SECRET ?? "test-coaching-webhook-secret";
  }

  private extractSignature(header: string): string | null {
    const part = header
      .split(",")
      .map((value) => value.trim())
      .find((value) => value.startsWith("v1="));
    return part ? part.slice(3) : null;
  }

  private mapStatus(
    eventType: string
  ): CoachingPaymentProviderWebhookEvent["status"] {
    switch (eventType) {
      case "checkout.session.completed":
        return "captured";
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed":
        return "failed";
      case "charge.refunded":
        return "refunded";
      default:
        return null;
    }
  }

  private maybeFail(operation: CoachingPaymentProviderOperation, message: string): void {
    if (this.failNextOperations.delete(operation)) {
      throw new Error(message);
    }
  }

  private pickString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private pickNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
