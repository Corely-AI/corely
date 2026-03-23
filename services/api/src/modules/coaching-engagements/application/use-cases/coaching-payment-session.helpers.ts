import type { ClockPort, IdGeneratorPort } from "@corely/kernel";
import { resolveLocalizedText } from "../../domain/coaching-localization";
import type { CoachingEngagementRecord, CoachingOfferRecord } from "../../domain/coaching.types";
import type { CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import type { CoachingPaymentProviderRegistryPort } from "../ports/coaching-payment-provider.port";

const APP_BASE_URL = process.env.WEB_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:8080";

export function resolveCoachingReturnUrl(path: string | undefined, fallbackPath: string): string {
  return new URL(path ?? fallbackPath, APP_BASE_URL).toString();
}

export async function createCoachingPaymentSession(params: {
  repo: CoachingEngagementRepositoryPort;
  paymentProviders: CoachingPaymentProviderRegistryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  engagement: CoachingEngagementRecord;
  offer: CoachingOfferRecord;
  sessionId?: string | null;
  customerEmail?: string | null;
  paymentProvider?: string;
  successPath?: string;
  cancelPath?: string;
}) {
  const provider = params.paymentProviders.get(params.paymentProvider);
  const paymentId = params.idGenerator.newId();
  const checkout = await provider.createCheckoutSession({
    tenantId: params.engagement.tenantId,
    engagementId: params.engagement.id,
    paymentId,
    title: resolveLocalizedText(
      params.offer.title,
      params.engagement.locale,
      params.offer.localeDefault
    ),
    description: params.offer.description
      ? resolveLocalizedText(
          params.offer.description,
          params.engagement.locale,
          params.offer.localeDefault
        )
      : null,
    amountCents: params.offer.priceCents,
    currency: params.offer.currency,
    customerEmail: params.customerEmail ?? null,
    successUrl: resolveCoachingReturnUrl(
      params.successPath,
      `/coaching/engagements/${params.engagement.id}`
    ),
    cancelUrl: resolveCoachingReturnUrl(
      params.cancelPath,
      `/coaching/engagements/${params.engagement.id}`
    ),
  });

  const now = params.clock.now();
  const payment = await params.repo.createPayment({
    id: paymentId,
    tenantId: params.engagement.tenantId,
    workspaceId: params.engagement.workspaceId,
    engagementId: params.engagement.id,
    sessionId: params.sessionId ?? null,
    provider: provider.providerName,
    status: "pending",
    amountCents: params.offer.priceCents,
    refundedAmountCents: 0,
    currency: params.offer.currency,
    customerEmail: params.customerEmail ?? null,
    providerCheckoutSessionId: checkout.checkoutSessionId,
    providerCheckoutUrl: checkout.checkoutUrl,
    providerPaymentRef: null,
    providerRefundRef: null,
    failureCode: null,
    failureMessage: null,
    checkoutCreatedAt: now,
    capturedAt: null,
    failedAt: null,
    refundedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const updatedEngagement = await params.repo.updateEngagement({
    ...params.engagement,
    stripeCheckoutSessionId:
      provider.providerName === "stripe"
        ? checkout.checkoutSessionId
        : params.engagement.stripeCheckoutSessionId,
    stripeCheckoutUrl:
      provider.providerName === "stripe"
        ? checkout.checkoutUrl
        : params.engagement.stripeCheckoutUrl,
    updatedAt: now,
  });

  return {
    engagement: updatedEngagement,
    payment,
    checkoutUrl: checkout.checkoutUrl,
    sessionId: checkout.checkoutSessionId,
  };
}
