import { Injectable } from "@nestjs/common";
import { type CreateTaxCodeInput } from "@corely/contracts";
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
export class CreateTaxCodeUseCase extends BaseUseCase<CreateTaxCodeInput, TaxCodeEntity> {
  constructor(private readonly repo: TaxCodeRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: CreateTaxCodeInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxCodeEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    const saved = await this.repo.create({
      tenantId: workspaceId,
      code: input.code,
      kind: input.kind,
      label: input.label,
      isActive: true,
    });

    return ok(saved);
  }
}
