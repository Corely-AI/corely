import { Injectable } from "@nestjs/common";
import type { GetTaxSummaryOutput } from "@corely/contracts";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
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
export class GetTaxSummaryUseCase extends BaseUseCase<void, GetTaxSummaryOutput> {
  constructor(private readonly resolver: TaxStrategyResolverService) {
    super({ logger: null as any });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<GetTaxSummaryOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const strategy = await this.resolver.resolve(workspaceId);
    const summary = await strategy.computeSummary({
      tenantId: ctx.tenantId!,
      workspaceId,
    });
    return ok(summary);
  }
}
