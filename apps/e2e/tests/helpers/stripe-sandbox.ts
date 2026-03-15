import path from "node:path";
import { config as loadDotenv } from "dotenv";

let envLoaded = false;

function ensureEnvLoaded(): void {
  if (envLoaded) {
    return;
  }

  loadDotenv({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });
  loadDotenv({
    path: path.resolve(process.cwd(), "../../.env.local"),
    override: true,
    quiet: true,
  });
  envLoaded = true;
}

function requireEnv(key: string): string {
  ensureEnvLoaded();
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required Stripe sandbox env: ${key}`);
  }
  return value;
}

function stripeSecretKey(): string {
  return requireEnv("STRIPE_SECRET_KEY");
}

function priceIdForCashPlan(planCode: string): string {
  switch (planCode) {
    case "starter-monthly":
      return requireEnv("STRIPE_BILLING_PRICE_STARTER_MONTHLY");
    case "pro-monthly":
      return requireEnv("STRIPE_BILLING_PRICE_PRO_MONTHLY");
    case "multi-location-monthly":
      return requireEnv("STRIPE_BILLING_PRICE_MULTI_LOCATION_MONTHLY");
    default:
      throw new Error(`Unsupported Stripe sandbox plan code: ${planCode}`);
  }
}

type StripeSubscription = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
      };
    }>;
  };
};

async function stripeRequest<T>(
  method: "GET" | "POST" | "DELETE",
  pathname: string,
  params?: Record<string, string | number | boolean | null | undefined>
): Promise<T> {
  const body = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        body.set(key, String(value));
      }
    }
  }

  const response = await fetch(`https://api.stripe.com/v1${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body.toString(),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `Stripe API ${method} ${pathname} failed: ${response.status} ${JSON.stringify(payload)}`
    );
  }

  return payload as T;
}

async function addStripeTestCardSource(customerRef: string): Promise<void> {
  await stripeRequest("POST", `/customers/${customerRef}`, {
    source: "tok_visa",
  });
}

export async function createCashManagementStripeSubscription(input: {
  customerRef: string;
  tenantId: string;
  planCode: "starter-monthly" | "pro-monthly" | "multi-location-monthly";
}): Promise<StripeSubscription> {
  await addStripeTestCardSource(input.customerRef);

  return stripeRequest<StripeSubscription>("POST", "/subscriptions", {
    customer: input.customerRef,
    "items[0][price]": priceIdForCashPlan(input.planCode),
    "metadata[tenantId]": input.tenantId,
    "metadata[productKey]": "cash-management",
    "metadata[planCode]": input.planCode,
  });
}

export async function updateCashManagementStripeSubscription(input: {
  subscriptionRef: string;
  tenantId: string;
  planCode: "starter-monthly" | "pro-monthly" | "multi-location-monthly";
}): Promise<StripeSubscription> {
  const current = await stripeRequest<StripeSubscription>(
    "GET",
    `/subscriptions/${input.subscriptionRef}`
  );
  const itemId = current.items.data[0]?.id;
  if (!itemId) {
    throw new Error(`Subscription ${input.subscriptionRef} has no updatable item`);
  }

  return stripeRequest<StripeSubscription>("POST", `/subscriptions/${input.subscriptionRef}`, {
    "items[0][id]": itemId,
    "items[0][price]": priceIdForCashPlan(input.planCode),
    proration_behavior: "none",
    "metadata[tenantId]": input.tenantId,
    "metadata[productKey]": "cash-management",
    "metadata[planCode]": input.planCode,
  });
}

export async function setStripeSubscriptionCancelAtPeriodEnd(input: {
  subscriptionRef: string;
  tenantId: string;
  planCode: "starter-monthly" | "pro-monthly" | "multi-location-monthly";
  cancelAtPeriodEnd: boolean;
}): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>("POST", `/subscriptions/${input.subscriptionRef}`, {
    cancel_at_period_end: input.cancelAtPeriodEnd,
    "metadata[tenantId]": input.tenantId,
    "metadata[productKey]": "cash-management",
    "metadata[planCode]": input.planCode,
  });
}

export async function cancelStripeSubscription(subscriptionRef: string): Promise<void> {
  await stripeRequest("DELETE", `/subscriptions/${subscriptionRef}`);
}
