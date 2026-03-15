import { Inject, Injectable } from "@nestjs/common";
import type { BillingProductKey, ResyncBillingSubscriptionOutput } from "@corely/contracts";
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

type ResyncBillingSubscriptionInput = {
  productKey?: BillingProductKey;
};

@RequireTenant()
@Injectable()
export class ResyncBillingSubscriptionUseCase extends BaseUseCase<
  ResyncBillingSubscriptionInput,
  ResyncBillingSubscriptionOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ResyncBillingSubscriptionInput,
    ctx: UseCaseContext
  ): Promise<Result<ResyncBillingSubscriptionOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    return ok({
      subscription: await this.billingAccess.syncSubscription(ctx.tenantId, input.productKey),
    });
  }
}
