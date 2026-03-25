import { Injectable } from "@nestjs/common";
import { ValidationError } from "@corely/kernel";
import { StripeCoachingPaymentProviderAdapter } from "./stripe-coaching-payment-provider.adapter";
import { FakeStripeCoachingPaymentProviderAdapter } from "./fake-stripe-coaching-payment-provider.adapter";
import type {
  CoachingPaymentProviderPort,
  CoachingPaymentProviderRegistryPort,
} from "../../application/ports/coaching-payment-provider.port";

@Injectable()
export class CoachingPaymentProviderRegistryService implements CoachingPaymentProviderRegistryPort {
  constructor(
    private readonly stripeProvider: StripeCoachingPaymentProviderAdapter,
    private readonly fakeStripeProvider: FakeStripeCoachingPaymentProviderAdapter
  ) {}

  get(providerName = "stripe"): CoachingPaymentProviderPort {
    if (providerName === "stripe") {
      return this.useFakeMode() ? this.fakeStripeProvider : this.stripeProvider;
    }

    throw new ValidationError("Unsupported coaching payment provider", { providerName });
  }

  getByWebhook(providerName: string): CoachingPaymentProviderPort {
    return this.get(providerName);
  }

  private useFakeMode(): boolean {
    return process.env.NODE_ENV === "test" || process.env.COACHING_PAYMENT_PROVIDER_MODE === "fake";
  }
}
