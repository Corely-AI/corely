import { Injectable } from "@nestjs/common";
import { TaxReportRepoPort } from "../../domain/ports/tax-report-repo.port";
import { ReportRegistry } from "../../domain/reporting/report-registry";
import { TaxProfileRepoPort } from "../../domain/ports/tax-profile-repo.port";
import { ReportGenerationContext } from "../../domain/reporting/report-strategy.interface";
import { TaxReportType, TaxReportGroup } from "@corely/contracts";

@Injectable()
export class GenerateTaxReportsUseCase {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly profileRepo: TaxProfileRepoPort,
    private readonly registry: ReportRegistry
  ) {}

  async execute(params: {
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    periodLabel: string;
    dryRun?: boolean;
  }): Promise<void> {
    const { tenantId, periodStart, periodEnd, periodLabel } = params;

    const profile = await this.profileRepo.getActive(tenantId, periodEnd);
    if (!profile) {
      return;
    } // Should log or throw

    const ctx: ReportGenerationContext = {
      tenantId,
      periodStart,
      periodEnd,
      profile: {
        ...profile,
        country: profile.country as "DE", // Constraint from contracts
        vatAccountingMethod: profile.vatAccountingMethod ?? "IST",
        effectiveFrom: profile.effectiveFrom.toISOString(),
        effectiveTo: profile.effectiveTo?.toISOString(),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      },
    };

    const strategies = this.registry.getStrategiesForCountry(profile.country);

    for (const strategy of strategies) {
      if (await strategy.isRequired(ctx)) {
        // Generate
        const result = await strategy.generate(ctx);
        const dueDate = strategy.getDueDate(periodEnd, ctx);

        // Determine group (mapping)
        let group: TaxReportGroup = "COMPLIANCE"; // default
        if (strategy.type === "VAT_ADVANCE") {
          group = "ADVANCE_VAT";
        }
        if (strategy.type === "VAT_ANNUAL" || strategy.type === "INCOME_TAX") {
          group = "ANNUAL_REPORT";
        }

        // Persist
        if (!params.dryRun) {
          const report = await this.reportRepo.upsertByPeriod({
            tenantId,
            type: strategy.type,
            group,
            periodLabel,
            periodStart,
            periodEnd,
            dueDate,
            status: "UPCOMING", // Default status, logic might update to OPEN if current date > periodEnd
            amountFinalCents: result.amountDueCents,
            // TODO: Persist lines if any
          });

          // If lines exist, we should save them too.
          // Note: Repo port needs update or specific method to save lines.
          // For now, assuming upsert handles basic report.
        }
      }
    }
  }
}
