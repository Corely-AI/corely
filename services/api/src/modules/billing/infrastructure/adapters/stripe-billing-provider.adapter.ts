import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { EnvService, type Env } from "@corely/config";
import {
  getBillingPlanDefinition,
  getStripePriceEnvKey,
  listBillingProducts,
} from "../../domain/billing-plans";
import type {
  BillingProviderPort,
  BillingProviderSubscriptionSnapshot,
  BillingProviderWebhookEvent,
} from "../../application/ports/billing-provider.port";

@Injectable()
export class StripeBillingProviderAdapter implements BillingProviderPort {
  private stripeClient: Stripe | null = null;

  constructor(private readonly env: EnvService) {}

  async ensureCustomer(input: {
    tenantId: string;
    accountId: string;
    tenantName: string;
    email?: string | null;
    existingCustomerRef?: string | null;
  }): Promise<{ customerRef: string }> {
    if (input.existingCustomerRef) {
      return { customerRef: input.existingCustomerRef };
    }

    const stripe = this.getClient();
    const customer = await stripe.customers.create({
      name: input.tenantName,
      email: input.email ?? undefined,
      metadata: {
        tenantId: input.tenantId,
        billingAccountId: input.accountId,
      },
    });

    return { customerRef: customer.id };
  }

  async createCheckoutSession(input: {
    tenantId: string;
    customerRef: string;
    productKey: string;
    planCode: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    const stripe = this.getClient();
    const priceId = this.getPriceId(input.productKey, input.planCode);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerRef,
      success_url: this.resolveSuccessUrl(input.successUrl),
      cancel_url: this.resolveCancelUrl(input.cancelUrl),
      client_reference_id: input.tenantId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        tenantId: input.tenantId,
        productKey: input.productKey,
        planCode: input.planCode,
      },
      subscription_data: {
        metadata: {
          tenantId: input.tenantId,
          productKey: input.productKey,
          planCode: input.planCode,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL");
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async createPortalSession(input: {
    customerRef: string;
    returnUrl: string;
  }): Promise<{ portalUrl: string }> {
    const stripe = this.getClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: input.customerRef,
      return_url: this.resolvePortalReturnUrl(input.returnUrl),
    });

    return { portalUrl: session.url };
  }

  async fetchSubscriptionSnapshot(input: {
    productKey?: string | null;
    subscriptionRef?: string | null;
    customerRef?: string | null;
  }): Promise<BillingProviderSubscriptionSnapshot | null> {
    const stripe = this.getClient();
    let subscription: Stripe.Subscription | null = null;

    if (input.subscriptionRef) {
      subscription = await stripe.subscriptions.retrieve(input.subscriptionRef);
    } else if (input.customerRef) {
      const list = await stripe.subscriptions.list({
        customer: input.customerRef,
        status: "all",
        limit: 20,
      });
      subscription =
        list.data.find(
          (item) =>
            (!input.productKey || item.metadata.productKey === input.productKey) &&
            item.status !== "canceled"
        ) ??
        list.data
          .filter((item) => !input.productKey || item.metadata.productKey === input.productKey)
          .sort((left, right) => right.created - left.created)[0] ??
        null;
    }

    if (!subscription) {
      return null;
    }

    return this.mapSubscriptionSnapshot(subscription);
  }

  verifyAndParseWebhook(input: {
    rawBody: Buffer;
    signature: string | undefined;
  }): BillingProviderWebhookEvent {
    const stripe = this.getClient();
    const secret = this.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    if (!input.signature) {
      throw new Error("Missing Stripe webhook signature");
    }

    const event = stripe.webhooks.constructEvent(input.rawBody, input.signature, secret);
    const object = event.data.object as unknown as Record<string, unknown>;
    const metadata = (object.metadata ?? {}) as Record<string, string | undefined>;
    const customerRef =
      typeof object.customer === "string"
        ? object.customer
        : typeof (object.customer as { id?: string } | null)?.id === "string"
          ? ((object.customer as { id: string }).id ?? null)
          : null;
    const subscriptionRef =
      typeof object.id === "string" && object.object === "subscription"
        ? object.id
        : typeof object.subscription === "string"
          ? object.subscription
          : null;

    return {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      customerRef,
      subscriptionRef,
      tenantId: metadata.tenantId ?? null,
      productKey: metadata.productKey ?? null,
      rawPayload: event,
    };
  }

  private getClient(): Stripe {
    if (this.stripeClient) {
      return this.stripeClient;
    }

    const secretKey = this.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    this.stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      appInfo: {
        name: "Corely Billing",
      },
    });

    return this.stripeClient;
  }

  private getPriceId(productKey: string, planCode: string): string {
    const priceEnvKey = getStripePriceEnvKey(productKey, planCode);
    if (!priceEnvKey) {
      throw new Error(`Stripe price id is missing for ${productKey}:${planCode}`);
    }

    const priceId = this.env.getValue(priceEnvKey as keyof Env);
    if (!priceId || typeof priceId !== "string") {
      throw new Error(`Stripe price id is missing for ${productKey}:${planCode}`);
    }

    return priceId;
  }

  private mapSubscriptionSnapshot(
    subscription: Stripe.Subscription
  ): BillingProviderSubscriptionSnapshot {
    const rawSubscription = subscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
    };
    const priceRef = subscription.items.data[0]?.price?.id ?? null;
    const resolved = this.resolveProductAndPlan(
      subscription.metadata.productKey,
      subscription.metadata.planCode,
      priceRef
    );
    const customerRef =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

    return {
      provider: "stripe",
      productKey: resolved.productKey,
      customerRef,
      subscriptionRef: subscription.id,
      priceRef,
      planCode: resolved.planCode,
      status: this.mapStatus(subscription.status),
      currentPeriodStart: new Date(
        (rawSubscription.current_period_start ?? subscription.created) * 1000
      ),
      currentPeriodEnd: new Date(
        (rawSubscription.current_period_end ?? subscription.created) * 1000
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      rawSnapshot: subscription,
    };
  }

  private resolveProductAndPlan(
    metadataProductKey: string | undefined,
    metadataPlanCode: string | undefined,
    priceRef: string | null
  ): { productKey: string; planCode: string } {
    if (metadataProductKey && metadataPlanCode) {
      try {
        getBillingPlanDefinition(metadataProductKey, metadataPlanCode);
        return { productKey: metadataProductKey, planCode: metadataPlanCode };
      } catch {
        // Fall through to price-based lookup.
      }
    }

    const priceMatch = this.resolveByPriceRef(priceRef);
    if (priceMatch) {
      return priceMatch;
    }

    throw new Error(
      `Unable to resolve Stripe billing mapping for product=${metadataProductKey ?? "unknown"} plan=${metadataPlanCode ?? "unknown"} price=${priceRef ?? "unknown"}`
    );
  }

  private resolveByPriceRef(
    priceRef: string | null
  ): { productKey: string; planCode: string } | null {
    if (!priceRef) {
      return null;
    }

    for (const product of listBillingProducts()) {
      for (const plan of Object.keys(product.plans)) {
        const envKey = getStripePriceEnvKey(product.productKey, plan);
        if (!envKey) {
          continue;
        }

        const configuredPriceRef = this.env.getValue(envKey as keyof Env);
        if (configuredPriceRef === priceRef) {
          return { productKey: product.productKey, planCode: plan };
        }
      }
    }

    return null;
  }

  private mapStatus(status: Stripe.Subscription.Status) {
    switch (status) {
      case "trialing":
        return "trialing";
      case "active":
        return "active";
      case "past_due":
        return "past_due";
      case "canceled":
        return "canceled";
      case "incomplete":
      case "incomplete_expired":
        return "incomplete";
      case "unpaid":
        return "unpaid";
      default:
        return "free";
    }
  }

  private resolveSuccessUrl(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    return this.joinBaseUrl(this.env.STRIPE_BILLING_SUCCESS_URL ?? this.env.WEB_BASE_URL, value);
  }

  private resolveCancelUrl(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    return this.joinBaseUrl(this.env.STRIPE_BILLING_CANCEL_URL ?? this.env.WEB_BASE_URL, value);
  }

  private resolvePortalReturnUrl(value: string): string {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    return this.joinBaseUrl(
      this.env.STRIPE_BILLING_PORTAL_RETURN_URL ?? this.env.WEB_BASE_URL,
      value
    );
  }

  private joinBaseUrl(base: string | undefined, path: string): string {
    if (!base) {
      throw new Error("Billing return URL base is not configured");
    }

    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }
}
