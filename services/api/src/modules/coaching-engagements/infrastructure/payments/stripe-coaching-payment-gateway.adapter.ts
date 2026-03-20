import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { EnvService } from "@corely/config";
import { type CoachingPaymentGatewayPort } from "../../application/ports/coaching-payment-gateway.port";

@Injectable()
export class StripeCoachingPaymentGatewayAdapter implements CoachingPaymentGatewayPort {
  private client: Stripe | null = null;

  constructor(private readonly env: EnvService) {}

  async createCheckoutSession(input: {
    tenantId: string;
    engagementId: string;
    title: string;
    description?: string | null;
    amountCents: number;
    currency: string;
    customerEmail?: string | null;
    successPath?: string;
    cancelPath?: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    const stripe = this.getClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: this.resolveUrl(
        input.successPath ?? `/coaching/engagements/${input.engagementId}`
      ),
      cancel_url: this.resolveUrl(
        input.cancelPath ?? `/coaching/engagements/${input.engagementId}`
      ),
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
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL");
    }

    return { sessionId: session.id, checkoutUrl: session.url };
  }

  async verifyWebhook(input: { rawBody: Buffer; signature?: string }) {
    const stripe = this.getClient();
    const secret = this.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    if (!input.signature) {
      throw new Error("Missing Stripe signature");
    }

    const event = stripe.webhooks.constructEvent(input.rawBody, input.signature, secret);
    const object = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
    const metadata = ("metadata" in object ? object.metadata : {}) ?? {};

    return {
      id: event.id,
      type: event.type,
      checkoutSessionId: object.object === "checkout.session" ? object.id : undefined,
      paymentIntentId:
        object.object === "checkout.session"
          ? typeof object.payment_intent === "string"
            ? object.payment_intent
            : undefined
          : object.object === "payment_intent"
            ? object.id
            : undefined,
      metadata,
    };
  }

  private resolveUrl(path: string) {
    const base = this.env.API_BASE_URL ?? "http://localhost:3000";
    return new URL(path, base).toString();
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
