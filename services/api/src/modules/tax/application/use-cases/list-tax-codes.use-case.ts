import { Injectable } from "@nestjs/common";
import { type TaxCodeEntity } from "../../domain/entities";
import { TaxCodeRepoPort } from "../../domain/ports";
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
export class ListTaxCodesUseCase extends BaseUseCase<void, TaxCodeEntity[]> {
  constructor(private readonly repo: TaxCodeRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<TaxCodeEntity[], UseCaseError>> {
    const codes = await this.repo.findAll(ctx.workspaceId || ctx.tenantId);
    return ok(codes);
  }
}
