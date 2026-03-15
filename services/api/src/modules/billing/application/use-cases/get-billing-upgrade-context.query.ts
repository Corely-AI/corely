import { Inject, Injectable } from "@nestjs/common";
import type { BillingProductKey, GetBillingUpgradeContextOutput } from "@corely/contracts";
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

type GetBillingUpgradeContextInput = {
  productKey?: BillingProductKey;
};

@RequireTenant()
@Injectable()
export class GetBillingUpgradeContextQueryUseCase extends BaseUseCase<
  GetBillingUpgradeContextInput,
  GetBillingUpgradeContextOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetBillingUpgradeContextInput,
    ctx: UseCaseContext
  ): Promise<Result<GetBillingUpgradeContextOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    return ok({
      upgradeContext: await this.billingAccess.getUpgradeContext(ctx.tenantId, input.productKey),
    });
  }
}
