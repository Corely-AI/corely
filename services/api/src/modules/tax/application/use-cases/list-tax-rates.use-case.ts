import { Injectable } from "@nestjs/common";
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
export class ListTaxRatesUseCase extends BaseUseCase<{ taxCodeId: string }, TaxRateEntity[]> {
  constructor(private readonly repo: TaxRateRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: { taxCodeId: string },
    ctx: UseCaseContext
  ): Promise<Result<TaxRateEntity[], UseCaseError>> {
    const scopeId = ctx.workspaceId || ctx.tenantId!;
    return ok(await this.repo.findByTaxCode(input.taxCodeId, scopeId));
  }
}
