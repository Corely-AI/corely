import { Injectable } from "@nestjs/common";
import type { ListTaxReportsOutput } from "@corely/contracts";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class ListTaxReportsUseCase {
  constructor(private readonly resolver: TaxStrategyResolverService) {}

  async execute(
    status: "upcoming" | "submitted",
    filters: { group?: string | null; type?: string | null } | undefined,
    ctx: UseCaseContext
  ): Promise<ListTaxReportsOutput> {
    const strategy = await this.resolver.resolve(ctx.tenantId);
    const reports = await strategy.listReports({ tenantId: ctx.tenantId }, status, filters);
    return { reports };
  }
}
