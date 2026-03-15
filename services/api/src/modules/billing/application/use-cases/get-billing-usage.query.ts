import { Inject, Injectable } from "@nestjs/common";
import type { BillingProductKey, GetBillingUsageOutput } from "@corely/contracts";
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

type GetBillingUsageInput = {
  productKey?: BillingProductKey;
};

@RequireTenant()
@Injectable()
export class GetBillingUsageQueryUseCase extends BaseUseCase<
  GetBillingUsageInput,
  GetBillingUsageOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetBillingUsageInput,
    ctx: UseCaseContext
  ): Promise<Result<GetBillingUsageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    return ok({
      usage: await this.billingAccess.getUsage(ctx.tenantId, input.productKey),
    });
  }
}
