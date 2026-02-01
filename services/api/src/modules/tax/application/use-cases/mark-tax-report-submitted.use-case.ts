import { Injectable } from "@nestjs/common";
import type { MarkTaxReportSubmittedOutput } from "@corely/contracts";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class MarkTaxReportSubmittedUseCase extends BaseUseCase<
  string,
  MarkTaxReportSubmittedOutput
> {
  constructor(private readonly resolver: TaxStrategyResolverService) {
    super({ logger: null as any });
  }

  protected async handle(
    id: string,
    ctx: UseCaseContext
  ): Promise<Result<MarkTaxReportSubmittedOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const strategy = await this.resolver.resolve(workspaceId);
    if (!strategy.markSubmitted) {
      return err(new NotFoundError("Mark submitted not available for this strategy"));
    }
    const report = await strategy.markSubmitted(
      { tenantId: ctx.tenantId!, workspaceId },
      id
    );
    return ok({ report });
  }
}
