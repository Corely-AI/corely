import { Injectable } from "@nestjs/common";
import { type TaxProfileEntity } from "../../domain/entities";
import { TaxProfileRepoPort } from "../../domain/ports";
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
export class GetTaxProfileUseCase extends BaseUseCase<void, TaxProfileEntity | null> {
  constructor(private readonly repo: TaxProfileRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<TaxProfileEntity | null, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    // Use getActive with current date as a proxy for "get current profile"
    const profile = await this.repo.getActive(workspaceId, new Date());
    return ok(profile);
  }
}
