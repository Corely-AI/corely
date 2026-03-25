import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { EnvService } from "@corely/config";
import {
  type CoachingPaymentProviderPort,
  type CoachingPaymentProviderWebhookEvent,
} from "../../application/ports/coaching-payment-provider.port";

@Injectable()
export class StripeCoachingPaymentProviderAdapter implements CoachingPaymentProviderPort {
  readonly providerName = "stripe";

  private client: Stripe | null = null;

  constructor(private readonly env: EnvService) {}

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
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail ?? undefined,
      client_reference_id: input.engagementId,
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: {
              name: input.title,
              description: input.description ?? undefined,
            },
            unit_amount: input.amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        tenantId: input.tenantId,
        engagementId: input.engagementId,
        paymentId: input.paymentId,
      },
      payment_intent_data: {
        metadata: {
          tenantId: input.tenantId,
          engagementId: input.engagementId,
          paymentId: input.paymentId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL");
    }

    return { checkoutSessionId: session.id, checkoutUrl: session.url };
  }

  async refundPayment(input: {
    paymentRef: string;
    amountCents?: number;
    reason?: string;
  }): Promise<{ refundRef: string; refundedAmountCents: number | null }> {
    const stripe = this.getClient();
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentRef,
      amount: input.amountCents,
      reason: input.reason ? "requested_by_customer" : undefined,
      metadata: input.reason ? { reason: input.reason } : undefined,
    });
    return {
      refundRef: refund.id,
      refundedAmountCents: typeof refund.amount === "number" ? refund.amount : null,
    };
  }

  async verifyAndParseWebhook(input: {
    rawBody: Buffer;
    signature?: string;
  }): Promise<CoachingPaymentProviderWebhookEvent> {
    const stripe = this.getClient();
    const secret = this.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    if (!input.signature) {
      throw new Error("Missing Stripe signature");
    }

    const event = stripe.webhooks.constructEvent(input.rawBody, input.signature, secret);
    const parsed = this.parseEvent(event);
    return {
      provider: this.providerName,
      eventId: event.id,
      eventType: event.type,
      ...parsed,
      rawPayload: event,
    };
  }

  private parseEvent(
    event: Stripe.Event
  ): Omit<
    CoachingPaymentProviderWebhookEvent,
    "provider" | "eventId" | "eventType" | "rawPayload"
  > {
    const dataObject = event.data.object as unknown as Record<string, unknown> & {
      metadata?: Record<string, string | undefined>;
    };
    const metadata = dataObject.metadata ?? {};

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        tenantId: metadata.tenantId ?? null,
        engagementId: metadata.engagementId ?? null,
        paymentId: metadata.paymentId ?? null,
        checkoutSessionId: session.id,
        paymentRef: typeof session.payment_intent === "string" ? session.payment_intent : null,
        refundRef: null,
        status: "captured",
        failureCode: null,
        failureMessage: null,
        refundedAmountCents: null,
      };
    }

    if (
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const paymentIntent =
        event.data.object.object === "payment_intent"
          ? (event.data.object as Stripe.PaymentIntent)
          : null;
      const lastError = paymentIntent?.last_payment_error;
      return {
        tenantId: metadata.tenantId ?? null,
        engagementId: metadata.engagementId ?? null,
        paymentId: metadata.paymentId ?? null,
        checkoutSessionId:
          event.data.object.object === "checkout.session"
            ? (event.data.object as Stripe.Checkout.Session).id
            : null,
        paymentRef: paymentIntent?.id ?? null,
        refundRef: null,
        status: "failed",
        failureCode: lastError?.code ?? null,
        failureMessage: lastError?.message ?? null,
        refundedAmountCents: null,
      };
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const chargeMetadata = charge.metadata ?? metadata;
      return {
        tenantId: chargeMetadata.tenantId ?? null,
        engagementId: chargeMetadata.engagementId ?? null,
        paymentId: chargeMetadata.paymentId ?? null,
        checkoutSessionId: null,
        paymentRef: typeof charge.payment_intent === "string" ? charge.payment_intent : null,
        refundRef: charge.refunds.data[0]?.id ?? null,
        status: "refunded",
        failureCode: null,
        failureMessage: null,
        refundedAmountCents: charge.amount_refunded ?? null,
      };
    }

    return {
      tenantId: metadata.tenantId ?? null,
      engagementId: metadata.engagementId ?? null,
      paymentId: metadata.paymentId ?? null,
      checkoutSessionId: null,
      paymentRef: null,
      refundRef: null,
      status: null,
      failureCode: null,
      failureMessage: null,
      refundedAmountCents: null,
    };
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }
    const secret = this.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    this.client = new Stripe(secret, { apiVersion: "2026-02-25.clover" });
    return this.client;
  }
}
