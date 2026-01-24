import { Injectable } from "@nestjs/common";
import type {
  TaxSummaryDto,
  TaxReportDto,
  TaxReportStatus,
  TaxReportType,
  TaxReportGroup,
} from "@corely/contracts";
import { TaxComputationStrategy, type TaxStrategyContext } from "./tax-strategy";
import { TaxSummaryQueryPort, TaxReportRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import type { TaxProfileEntity } from "../../domain/entities";
import type { TaxSummaryTotals } from "../../domain/ports";
import { DEPackV1 } from "./jurisdictions/de-pack.v1";

@Injectable()
export class PersonalTaxStrategy implements TaxComputationStrategy {
  constructor(
    private readonly summaryQuery: TaxSummaryQueryPort,
    private readonly reportRepo: TaxReportRepoPort,
    private readonly profileRepo: TaxProfileRepoPort,
    private readonly dePack: DEPackV1
  ) {}

  async computeSummary(ctx: TaxStrategyContext): Promise<TaxSummaryDto> {
    await this.reportRepo.seedDefaultReports(ctx.workspaceId);
    const totals = await this.summaryQuery.getTotals(ctx.workspaceId);
    const reports = await this.reportRepo.listByStatus(ctx.workspaceId, "upcoming");
    const now = new Date();
    const profile = await this.profileRepo.getActive(ctx.workspaceId, now);

    const { taxesToBePaidEstimatedCents, configurationStatus, warnings } =
      await this.computePayable(profile, totals, ctx.workspaceId, now);

    const preview = reports
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3)
      .map((r) => this.toReportDtoWithEstimate(r, taxesToBePaidEstimatedCents));

    return {
      taxesToBePaidEstimatedCents,
      configurationStatus,
      warnings,
      incomeTotalCents: totals.incomeTotalCents,
      unpaidInvoicesCount: totals.unpaidInvoicesCount,
      expensesTotalCents: totals.expensesTotalCents,
      expenseItemsToReviewCount: totals.expenseItemsToReviewCount,
      upcomingReportCount: reports.length,
      upcomingReportsPreview: preview,
      localTaxOfficeName: profile?.localTaxOfficeName ?? null,
      workspaceKind: "PERSONAL",
    };
  }

  async listReports(
    ctx: TaxStrategyContext,
    status: "upcoming" | "submitted",
    filters?: { group?: string | null; type?: string | null }
  ): Promise<TaxReportDto[]> {
    await this.reportRepo.seedDefaultReports(ctx.workspaceId);
    const reports = await this.reportRepo.listByStatus(ctx.workspaceId, status);
    const filtered = reports.filter((r) => {
      const groupOk = filters?.group ? r.group === filters.group : true;
      const typeOk = filters?.type ? r.type === filters.type : true;
      return groupOk && typeOk;
    });
    return filtered.map((r) => this.toReportDto(r));
  }

  async markSubmitted(ctx: TaxStrategyContext, id: string): Promise<TaxReportDto> {
    const report = await this.reportRepo.markSubmitted(ctx.workspaceId, id, new Date());
    return this.toReportDto(report);
  }

  private toReportDtoWithEstimate(
    entity: {
      id: string;
      tenantId: string;
      type: TaxReportType;
      group: TaxReportGroup;
      periodLabel: string;
      periodStart: Date;
      periodEnd: Date;
      dueDate: Date;
      status: TaxReportStatus;
      amountEstimatedCents: number | null;
      amountFinalCents?: number | null;
      currency: string;
      submittedAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    fallbackEstimateCents: number
  ): TaxReportDto {
    const dto = this.toReportDto(entity);
    return {
      ...dto,
      amountEstimatedCents: dto.amountEstimatedCents ?? fallbackEstimateCents ?? 0,
    };
  }

  private toReportDto(entity: {
    id: string;
    tenantId: string;
    type: TaxReportType;
    group: TaxReportGroup;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    status: TaxReportStatus;
    amountEstimatedCents: number | null;
    amountFinalCents?: number | null;
    currency: string;
    submittedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): TaxReportDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      type: entity.type,
      group: entity.group,
      periodLabel: entity.periodLabel,
      periodStart: entity.periodStart.toISOString(),
      periodEnd: entity.periodEnd.toISOString(),
      dueDate: entity.dueDate.toISOString(),
      status: entity.status,
      amountEstimatedCents: entity.amountEstimatedCents ?? null,
      amountFinalCents: entity.amountFinalCents ?? null,
      currency: entity.currency,
      submittedAt: entity.submittedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private async computePayable(
    profile: TaxProfileEntity | null,
    totals: TaxSummaryTotals,
    workspaceId: string,
    at: Date
  ): Promise<{
    taxesToBePaidEstimatedCents: number;
    configurationStatus: "READY" | "MISSING_SETTINGS" | "NOT_APPLICABLE";
    warnings: string[];
  }> {
    if (!profile) {
      return {
        taxesToBePaidEstimatedCents: 0,
        configurationStatus: "MISSING_SETTINGS",
        warnings: ["Tax profile is not configured"],
      };
    }

    if (!profile.vatEnabled || profile.regime !== "STANDARD_VAT") {
      return {
        taxesToBePaidEstimatedCents: 0,
        configurationStatus: "NOT_APPLICABLE",
        warnings: ["VAT is not applicable for the current tax profile"],
      };
    }

    const rateBps = await this.dePack.getRateBps("STANDARD", at, workspaceId);
    const outputVatCents = Math.round((totals.incomeTotalCents * rateBps) / 10_000);

    const warnings = ["Input VAT from expenses is not yet tracked; deduction not applied"];

    return {
      taxesToBePaidEstimatedCents: outputVatCents,
      configurationStatus: "READY",
      warnings,
    };
  }
}
