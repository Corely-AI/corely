import { Injectable } from "@nestjs/common";
import { type CreateTaxRateInput } from "@corely/contracts";
import { type TaxRateEntity } from "../../domain/entities";
import { TaxRateRepoPort } from "../../domain/ports";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class CreateTaxRateUseCase extends BaseUseCase<CreateTaxRateInput, TaxRateEntity> {
  constructor(private readonly repo: TaxRateRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: CreateTaxRateInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxRateEntity, UseCaseError>> {
    const scopeId = ctx.workspaceId || ctx.tenantId!;
    const rate = await this.repo.create({
      tenantId: scopeId,
      taxCodeId: input.taxCodeId,
      rateBps: input.rateBps,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
    });
    return ok(rate);
  }
}
