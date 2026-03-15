import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateBillingCheckoutSessionInput,
  CreateBillingCheckoutSessionOutput,
} from "@corely/contracts";
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

@RequireTenant()
@Injectable()
export class CreateBillingCheckoutSessionUseCase extends BaseUseCase<
  CreateBillingCheckoutSessionInput,
  CreateBillingCheckoutSessionOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: CreateBillingCheckoutSessionInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateBillingCheckoutSessionOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    return ok(await this.billingAccess.createCheckoutSession(ctx.tenantId, input));
  }
}
