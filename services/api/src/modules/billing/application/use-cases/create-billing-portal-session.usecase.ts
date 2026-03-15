import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateBillingPortalSessionInput,
  CreateBillingPortalSessionOutput,
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
export class CreateBillingPortalSessionUseCase extends BaseUseCase<
  CreateBillingPortalSessionInput,
  CreateBillingPortalSessionOutput
> {
  constructor(
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: CreateBillingPortalSessionInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateBillingPortalSessionOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      throw new ValidationError("Missing tenant context");
    }

    return ok(await this.billingAccess.createPortalSession(ctx.tenantId, input));
  }
}
