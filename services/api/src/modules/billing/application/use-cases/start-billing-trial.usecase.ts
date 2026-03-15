import { Inject, Injectable } from "@nestjs/common";
import type { StartBillingTrialInput, StartBillingTrialOutput } from "@corely/contracts";
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
export class StartBillingTrialUseCase extends BaseUseCase<
  StartBillingTrialInput,
  StartBillingTrialOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: StartBillingTrialInput,
    ctx: UseCaseContext
  ): Promise<Result<StartBillingTrialOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    return ok(await this.billingAccess.startTrial(ctx.tenantId, ctx.userId ?? null, input));
  }
}
