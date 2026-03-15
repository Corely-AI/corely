import { Inject, Injectable } from "@nestjs/common";
import type { BillingProductKey, GetBillingCurrentOutput } from "@corely/contracts";
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
import { getBillingPlanDefinition } from "../../domain/billing-plans";

type GetBillingCurrentInput = {
  productKey?: BillingProductKey;
};

@RequireTenant()
@Injectable()
export class GetBillingCurrentQueryUseCase extends BaseUseCase<
  GetBillingCurrentInput,
  GetBillingCurrentOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetBillingCurrentInput,
    ctx: UseCaseContext
  ): Promise<Result<GetBillingCurrentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    const [subscription, entitlements, trial, upgradeContext] = await Promise.all([
      this.billingAccess.getSubscription(ctx.tenantId, input.productKey),
      this.billingAccess.getEntitlements(ctx.tenantId, input.productKey),
      this.billingAccess.getTrial(ctx.tenantId, input.productKey),
      this.billingAccess.getUpgradeContext(ctx.tenantId, input.productKey),
    ]);

    return ok({
      subscription,
      entitlements,
      trial,
      upgradeContext,
      plan: getBillingPlanDefinition(subscription.productKey, subscription.planCode),
    });
  }
}
