import { Inject, Injectable } from "@nestjs/common";
import type { BillingProductKey, GetBillingOverviewOutput } from "@corely/contracts";
import {
  BaseUseCase,
  RequireTenant,
  ValidationError,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../ports/billing-access.port";
import { listBillingPlans } from "../../domain/billing-plans";

type GetBillingOverviewInput = {
  productKey?: BillingProductKey;
};

@RequireTenant()
@Injectable()
export class GetBillingOverviewQueryUseCase extends BaseUseCase<
  GetBillingOverviewInput,
  GetBillingOverviewOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetBillingOverviewInput,
    ctx: UseCaseContext
  ): Promise<Result<GetBillingOverviewOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    const [subscription, entitlements, usage, trial, upgradeContext] = await Promise.all([
      this.billingAccess.getSubscription(ctx.tenantId, input.productKey),
      this.billingAccess.getEntitlements(ctx.tenantId, input.productKey),
      this.billingAccess.getUsage(ctx.tenantId, input.productKey),
      this.billingAccess.getTrial(ctx.tenantId, input.productKey),
      this.billingAccess.getUpgradeContext(ctx.tenantId, input.productKey),
    ]);

    const plans = listBillingPlans(subscription.productKey);
    const currentPlanRank =
      plans.find((candidate) => candidate.code === subscription.planCode)?.upgradeRank ?? 0;

    return ok({
      billing: {
        productKey: subscription.productKey,
        subscription,
        entitlements,
        trial,
        upgradeContext,
        usage,
        plans,
        management: {
          canManageBilling: subscription.provider === "stripe" || subscription.planCode !== "free",
          canUpgrade: plans.some((plan) => plan.upgradeRank > currentPlanRank),
          canStartTrial: trial.status === "not_started",
          recommendedPlanCode: upgradeContext.recommendedPlanCode,
          requiresUpgradePrompt: upgradeContext.requiresUpgrade,
        },
      },
    });
  }
}
