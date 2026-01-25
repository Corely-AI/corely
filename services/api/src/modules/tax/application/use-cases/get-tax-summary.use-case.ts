import { Injectable } from "@nestjs/common";
import type { GetTaxSummaryOutput } from "@corely/contracts";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class GetTaxSummaryUseCase {
  constructor(private readonly resolver: TaxStrategyResolverService) {}

  async execute(ctx: UseCaseContext): Promise<GetTaxSummaryOutput> {
    const strategy = await this.resolver.resolve(ctx.workspaceId);
    const summary = await strategy.computeSummary({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
    });
    return summary;
  }
}
