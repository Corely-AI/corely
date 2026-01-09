import { Injectable, NotFoundException } from "@nestjs/common";
import type { MarkTaxReportSubmittedOutput } from "@corely/contracts";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class MarkTaxReportSubmittedUseCase {
  constructor(private readonly resolver: TaxStrategyResolverService) {}

  async execute(id: string, ctx: UseCaseContext): Promise<MarkTaxReportSubmittedOutput> {
    const strategy = await this.resolver.resolve(ctx.tenantId);
    if (!strategy.markSubmitted) {
      throw new NotFoundException("Mark submitted not available for this strategy");
    }
    const report = await strategy.markSubmitted({ tenantId: ctx.tenantId }, id);
    return { report };
  }
}
