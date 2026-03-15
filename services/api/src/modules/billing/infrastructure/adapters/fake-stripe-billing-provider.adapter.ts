import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { EnvService } from "@corely/config";
import type {
  BillingProviderPort,
  BillingProviderSubscriptionSnapshot,
  BillingProviderTestHooksPort,
  BillingProviderTestOperation,
  BillingProviderWebhookEvent,
} from "../../application/ports/billing-provider.port";
import { getBillingPlanDefinition } from "../../domain/billing-plans";

type FakeStripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

@Injectable()
export class FakeStripeBillingProviderAdapter
  implements BillingProviderPort, BillingProviderTestHooksPort
{
  private sessionSequence = 0;
  private portalSequence = 0;
  private readonly snapshotsBySubscription = new Map<string, BillingProviderSubscriptionSnapshot>();
  private readonly snapshotsByCustomer = new Map<string, BillingProviderSubscriptionSnapshot[]>();
  private readonly failNextOperations = new Set<BillingProviderTestOperation>();

  constructor(private readonly env: EnvService) {}

  reset(): void {
    this.sessionSequence = 0;
    this.portalSequence = 0;
    this.snapshotsBySubscription.clear();
    this.snapshotsByCustomer.clear();
    this.failNextOperations.clear();
  }

  failNext(operation: BillingProviderTestOperation): void {
    this.failNextOperations.add(operation);
  }

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

    return {
      customerRef: `cus_fake_${input.accountId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`,
    };
  }

  async createCheckoutSession(input: {
    tenantId: string;
    customerRef: string;
    productKey: string;
    planCode: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    this.maybeFail(
      "checkout",
      `Fake Stripe checkout failed for ${input.productKey}:${input.planCode}`
    );

    const sessionId = `cs_fake_${++this.sessionSequence}`;
    return {
      sessionId,
      checkoutUrl:
        `https://billing.fake.corely.test/checkout/${sessionId}` +
        `?tenant=${encodeURIComponent(input.tenantId)}` +
        `&product=${encodeURIComponent(input.productKey)}` +
        `&plan=${encodeURIComponent(input.planCode)}`,
    };
  }

  async createPortalSession(input: {
    customerRef: string;
    returnUrl: string;
  }): Promise<{ portalUrl: string }> {
    this.maybeFail("portal", `Fake Stripe portal failed for customer ${input.customerRef}`);

    const portalId = `bps_fake_${++this.portalSequence}`;
    return {
      portalUrl:
        `https://billing.fake.corely.test/portal/${portalId}` +
        `?customer=${encodeURIComponent(input.customerRef)}` +
        `&return=${encodeURIComponent(input.returnUrl)}`,
    };
  }

  async fetchSubscriptionSnapshot(input: {
    productKey?: string | null;
    subscriptionRef?: string | null;
    customerRef?: string | null;
  }): Promise<BillingProviderSubscriptionSnapshot | null> {
    this.maybeFail("fetch-subscription", "Fake Stripe fetch subscription failed");

    if (input.subscriptionRef) {
      return this.snapshotsBySubscription.get(input.subscriptionRef) ?? null;
    }

    if (!input.customerRef) {
      return null;
    }

    const snapshots = this.snapshotsByCustomer.get(input.customerRef) ?? [];
    const filtered = input.productKey
      ? snapshots.filter((snapshot) => snapshot.productKey === input.productKey)
      : snapshots;

    return filtered.find((snapshot) => snapshot.status !== "canceled") ?? filtered.at(-1) ?? null;
  }

  verifyAndParseWebhook(input: {
    rawBody: Buffer;
    signature: string | undefined;
  }): BillingProviderWebhookEvent {
    const secret = this.webhookSecret();
    if (!input.signature) {
      throw new UnauthorizedException("Missing Stripe webhook signature");
    }

    const expected = this.signPayload(input.rawBody, secret);
    const actual = this.extractSignature(input.signature);
    if (!actual || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
      throw new UnauthorizedException("Invalid Stripe webhook signature");
    }

    const event = JSON.parse(input.rawBody.toString("utf8")) as FakeStripeEvent;
    const object = event.data?.object ?? {};
    const metadata = this.asRecord(object.metadata);
    const customerRef = this.pickString(object.customer) ?? this.pickString(object.customerRef);
    const subscriptionRef =
      this.pickString(object.subscription) ??
      this.pickString(object.subscriptionRef) ??
      (object.object === "subscription" ? this.pickString(object.id) : null);
    const tenantId = this.pickString(metadata.tenantId) ?? this.pickString(object.tenantId);
    const productKey = this.pickString(metadata.productKey) ?? this.pickString(object.productKey);

    const snapshot = this.extractSnapshot(object, customerRef, subscriptionRef);
    if (snapshot) {
      this.storeSnapshot(snapshot);
    }

    return {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      customerRef,
      subscriptionRef,
      tenantId,
      productKey,
      rawPayload: event,
    };
  }

  private webhookSecret(): string {
    return this.env.STRIPE_WEBHOOK_SECRET ?? "test-billing-webhook-secret";
  }

  private signPayload(rawBody: Buffer, secret: string): string {
    return createHmac("sha256", secret).update(rawBody).digest("hex");
  }

  private extractSignature(header: string): string | null {
    const value = header
      .split(",")
      .map((part) => part.trim())
      .find((part) => part.startsWith("v1="));
    return value ? value.slice(3) : null;
  }

  private maybeFail(operation: BillingProviderTestOperation, message: string): void {
    if (this.failNextOperations.delete(operation)) {
      throw new Error(message);
    }
  }

  private extractSnapshot(
    object: Record<string, unknown>,
    customerRef: string | null,
    subscriptionRef: string | null
  ): BillingProviderSubscriptionSnapshot | null {
    const explicit = this.asRecord(object.subscriptionSnapshot);
    if (Object.keys(explicit).length > 0) {
      return this.snapshotFromExplicit(explicit, customerRef, subscriptionRef);
    }

    const metadata = this.asRecord(object.metadata);
    const productKey = this.pickString(metadata.productKey) ?? this.pickString(object.productKey);
    const planCode = this.pickString(metadata.planCode) ?? this.pickString(object.planCode);
    const status = this.normalizeStatus(this.pickString(object.status));
    if (!productKey || !planCode || !status || !customerRef || !subscriptionRef) {
      return null;
    }

    getBillingPlanDefinition(productKey, planCode);

    return {
      provider: "stripe",
      productKey,
      customerRef,
      subscriptionRef,
      priceRef: this.pickPriceRef(object),
      planCode,
      status,
      currentPeriodStart: this.toDate(
        object.current_period_start ?? object.currentPeriodStart ?? object.periodStart
      ),
      currentPeriodEnd: this.toDate(
        object.current_period_end ?? object.currentPeriodEnd ?? object.periodEnd
      ),
      cancelAtPeriodEnd: object.cancel_at_period_end === true || object.cancelAtPeriodEnd === true,
      canceledAt: this.toDate(object.canceled_at ?? object.canceledAt),
      trialEndsAt: this.toDate(object.trial_end ?? object.trialEndsAt),
      rawSnapshot: object,
    };
  }

  private snapshotFromExplicit(
    snapshot: Record<string, unknown>,
    fallbackCustomerRef: string | null,
    fallbackSubscriptionRef: string | null
  ): BillingProviderSubscriptionSnapshot {
    const productKey = this.requiredString(snapshot.productKey, "Missing fake Stripe productKey");
    const planCode = this.requiredString(snapshot.planCode, "Missing fake Stripe planCode");
    getBillingPlanDefinition(productKey, planCode);

    return {
      provider: "stripe",
      productKey,
      customerRef: this.requiredString(
        snapshot.customerRef ?? fallbackCustomerRef,
        "Missing fake Stripe customerRef"
      ),
      subscriptionRef: this.requiredString(
        snapshot.subscriptionRef ?? fallbackSubscriptionRef,
        "Missing fake Stripe subscriptionRef"
      ),
      priceRef: this.pickString(snapshot.priceRef),
      planCode,
      status: this.normalizeStatus(
        this.requiredString(snapshot.status, "Missing fake Stripe status")
      ),
      currentPeriodStart: this.toDate(snapshot.currentPeriodStart),
      currentPeriodEnd: this.toDate(snapshot.currentPeriodEnd),
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd === true,
      canceledAt: this.toDate(snapshot.canceledAt),
      trialEndsAt: this.toDate(snapshot.trialEndsAt),
      rawSnapshot: snapshot.rawSnapshot ?? snapshot,
    };
  }

  private storeSnapshot(snapshot: BillingProviderSubscriptionSnapshot): void {
    this.snapshotsBySubscription.set(snapshot.subscriptionRef, snapshot);
    const existing = this.snapshotsByCustomer.get(snapshot.customerRef) ?? [];
    const filtered = existing.filter(
      (candidate) => candidate.subscriptionRef !== snapshot.subscriptionRef
    );
    filtered.push(snapshot);
    this.snapshotsByCustomer.set(snapshot.customerRef, filtered);
  }

  private pickPriceRef(object: Record<string, unknown>): string | null {
    const items = this.asRecord(object.items);
    const data = Array.isArray(items.data) ? items.data : [];
    const first = (data[0] ?? {}) as Record<string, unknown>;
    const price = this.asRecord(first.price);
    return this.pickString(price.id) ?? this.pickString(object.priceRef);
  }

  private normalizeStatus(
    value: string | null
  ): BillingProviderSubscriptionSnapshot["status"] | null {
    switch (value) {
      case "trialing":
      case "active":
      case "past_due":
      case "canceled":
      case "incomplete":
      case "unpaid":
      case "free":
        return value;
      case "incomplete_expired":
        return "incomplete";
      default:
        return null;
    }
  }

  private toDate(value: unknown): Date | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "number") {
      return new Date(value * 1000);
    }
    if (typeof value === "string" && value.length > 0) {
      return new Date(value);
    }
    return null;
  }

  private pickString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  private requiredString(value: unknown, message: string): string {
    const result = this.pickString(value);
    if (!result) {
      throw new Error(message);
    }
    return result;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
