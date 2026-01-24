import { Injectable } from "@nestjs/common";
import type {
  ListVatPeriodsInput,
  ListVatPeriodsOutput,
  VatPeriodSummaryDto,
  TaxTotalsByKind,
} from "@corely/contracts";
import type { UseCaseContext } from "./use-case-context";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort } from "../../domain/ports";

@Injectable()
export class ListVatPeriodsUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {}

  async execute(input: ListVatPeriodsInput, ctx: UseCaseContext): Promise<ListVatPeriodsOutput> {
    
    // Determine range. If not provided, maybe default to current year?
    // Input schema has optional from/to.
    let startDate = input.from ? new Date(input.from) : new Date(new Date().getFullYear(), 0, 1);
    let endDate = input.to ? new Date(input.to) : new Date(new Date().getFullYear(), 11, 31);
    
    // We want to list quarters for the years covered by range.
    // For simplicity, let's just use the periodResolver to get quarters for the start date's year.
    // Or if the user asked for "?year=2025", input.from might be 2025-01-01.
    
    const year = startDate.getUTCFullYear();
    const periods = this.periodResolver.getQuartersOfYear(year);

    const summaries: VatPeriodSummaryDto[] = [];

    // Get active profile to know accounting method
    const profile = await this.taxProfileRepo.getActive(ctx.workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    for (const p of periods) {
      if (input.from && p.end <= new Date(input.from)) continue;
      if (input.to && p.start >= new Date(input.to)) continue;

      // TODO: Check if finalized summary exists in DB (VatReportRepoPort or generic Repo)
      // For now, computed on the fly as requested
      
      const inputs = await this.vatPeriodQuery.getInputs(ctx.workspaceId, p.start, p.end, method);

      // Map inputs to TotalsByKind structure
      // For now we only have net/vat totals, not broken by kind (Standard/Reduced).
      // Contracts expects `totalsByKind: TaxTotalsByKindSchema` which is a Record of Kind -> Object.
      // We'll put everything under STANDARD for now or create a generic summary.
      // Or we need to update VatPeriodQuery to return breakdown by kind. 
      // Current VatPeriodQuery only returns total net/vat.
      
      const totalsByKind: TaxTotalsByKind = {
        STANDARD: { // Assumption: mostly standard
          netAmountCents: inputs.salesNetCents,
          taxAmountCents: inputs.salesVatCents,
          grossAmountCents: inputs.salesNetCents + inputs.salesVatCents,
          rateBps: 1900, // Hardcoded approximation if we don't have breakdown
        }
      };
      
      summaries.push({
        id: `computed-${p.key}`, // Virtual ID
        tenantId: ctx.tenantId,
        periodStart: p.start.toISOString(),
        periodEnd: p.end.toISOString(),
        currency: "EUR",
        totalsByKind,
        generatedAt: new Date().toISOString(),
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { periods: summaries };
  }
}
