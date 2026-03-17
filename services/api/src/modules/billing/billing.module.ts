import { Module, forwardRef } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity/identity.module";
import { BillingController } from "./http/billing.controller";
import { BillingAccessService } from "./application/billing-access.service";
import { BILLING_ACCESS_PORT } from "./application/ports/billing-access.port";
import {
  BILLING_ACCOUNT_REPO,
  BILLING_PROVIDER_EVENT_REPO,
  BILLING_SUBSCRIPTION_REPO,
  BILLING_TRIAL_REPO,
  BILLING_USAGE_REPO,
} from "./application/ports/billing-repository.port";
import { BILLING_PROVIDER_PORT } from "./application/ports/billing-provider.port";
import { PrismaBillingRepositoryAdapter } from "./infrastructure/adapters/prisma-billing-repository.adapter";
import { GetBillingCurrentQueryUseCase } from "./application/use-cases/get-billing-current.query";
import { GetBillingUsageQueryUseCase } from "./application/use-cases/get-billing-usage.query";
import { GetBillingOverviewQueryUseCase } from "./application/use-cases/get-billing-overview.query";
import { GetBillingUpgradeContextQueryUseCase } from "./application/use-cases/get-billing-upgrade-context.query";
import { CreateBillingCheckoutSessionUseCase } from "./application/use-cases/create-billing-checkout-session.usecase";
import { CreateBillingPortalSessionUseCase } from "./application/use-cases/create-billing-portal-session.usecase";
import { ResyncBillingSubscriptionUseCase } from "./application/use-cases/resync-billing-subscription.usecase";
import { ProcessStripeWebhookUseCase } from "./application/use-cases/process-stripe-webhook.usecase";
import { StripeBillingProviderAdapter } from "./infrastructure/adapters/stripe-billing-provider.adapter";
import { FakeStripeBillingProviderAdapter } from "./infrastructure/adapters/fake-stripe-billing-provider.adapter";
import { BILLING_PROVIDER_TEST_HOOKS } from "./application/ports/billing-provider.port";
import { StartBillingTrialUseCase } from "./application/use-cases/start-billing-trial.usecase";

@Module({
  imports: [DataModule, KernelModule, forwardRef(() => IdentityModule)],
  controllers: [BillingController],
  providers: [
    PrismaBillingRepositoryAdapter,
    StripeBillingProviderAdapter,
    FakeStripeBillingProviderAdapter,
    {
      provide: BILLING_ACCOUNT_REPO,
      useExisting: PrismaBillingRepositoryAdapter,
    },
    {
      provide: BILLING_SUBSCRIPTION_REPO,
      useExisting: PrismaBillingRepositoryAdapter,
    },
    {
      provide: BILLING_USAGE_REPO,
      useExisting: PrismaBillingRepositoryAdapter,
    },
    {
      provide: BILLING_TRIAL_REPO,
      useExisting: PrismaBillingRepositoryAdapter,
    },
    {
      provide: BILLING_PROVIDER_EVENT_REPO,
      useExisting: PrismaBillingRepositoryAdapter,
    },
    {
      provide: BILLING_PROVIDER_PORT,
      useFactory: (
        stripeProvider: StripeBillingProviderAdapter,
        fakeStripeProvider: FakeStripeBillingProviderAdapter
      ) =>
        process.env.NODE_ENV === "test" || process.env.BILLING_PROVIDER_MODE === "fake"
          ? fakeStripeProvider
          : stripeProvider,
      inject: [StripeBillingProviderAdapter, FakeStripeBillingProviderAdapter],
    },
    {
      provide: BILLING_PROVIDER_TEST_HOOKS,
      useFactory: (fakeStripeProvider: FakeStripeBillingProviderAdapter) =>
        process.env.NODE_ENV === "test" || process.env.BILLING_PROVIDER_MODE === "fake"
          ? fakeStripeProvider
          : null,
      inject: [FakeStripeBillingProviderAdapter],
    },
    BillingAccessService,
    {
      provide: BILLING_ACCESS_PORT,
      useExisting: BillingAccessService,
    },
    GetBillingCurrentQueryUseCase,
    GetBillingUsageQueryUseCase,
    GetBillingOverviewQueryUseCase,
    GetBillingUpgradeContextQueryUseCase,
    CreateBillingCheckoutSessionUseCase,
    CreateBillingPortalSessionUseCase,
    StartBillingTrialUseCase,
    ResyncBillingSubscriptionUseCase,
    ProcessStripeWebhookUseCase,
  ],
  exports: [BILLING_ACCESS_PORT, BillingAccessService],
})
export class BillingModule {}
