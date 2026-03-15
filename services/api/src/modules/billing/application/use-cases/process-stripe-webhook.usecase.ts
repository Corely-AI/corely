import { Inject, Injectable } from "@nestjs/common";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../ports/billing-access.port";
import { BILLING_PROVIDER_PORT, type BillingProviderPort } from "../ports/billing-provider.port";

@Injectable()
export class ProcessStripeWebhookUseCase {
  constructor(
    @Inject(BILLING_PROVIDER_PORT)
    private readonly provider: BillingProviderPort,
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {}

  async execute(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const event = this.provider.verifyAndParseWebhook({ rawBody, signature });
    if (!event.tenantId) {
      return;
    }

    await this.billingAccess.processVerifiedWebhookEvent({
      provider: event.provider,
      eventId: event.eventId,
      eventType: event.eventType,
      tenantId: event.tenantId,
      customerRef: event.customerRef,
      subscriptionRef: event.subscriptionRef,
      productKey: event.productKey,
      rawPayload: event.rawPayload,
    });
  }
}
