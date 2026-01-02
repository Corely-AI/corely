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

@Injectable()
export class PersonalTaxStrategy implements TaxComputationStrategy {
  constructor(
    private readonly summaryQuery: TaxSummaryQueryPort,
    private readonly reportRepo: TaxReportRepoPort,
    private readonly profileRepo: TaxProfileRepoPort
  ) {}

  async computeSummary(ctx: TaxStrategyContext): Promise<TaxSummaryDto> {
    await this.reportRepo.seedDefaultReports(ctx.tenantId);
    const totals = await this.summaryQuery.getTotals(ctx.tenantId);
    const profile = await this.profileRepo.getActive(ctx.tenantId, new Date());

    const reports = await this.reportRepo.listByStatus(ctx.tenantId, "upcoming");
    const preview = reports
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 3)
      .map((r) => this.toReportDto(r));

    const taxesToBePaidEstimatedCents =
      reports.find((r) => r.status !== "SUBMITTED")?.amountEstimatedCents ?? 0;

    return {
      taxesToBePaidEstimatedCents,
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
    await this.reportRepo.seedDefaultReports(ctx.tenantId);
    const reports = await this.reportRepo.listByStatus(ctx.tenantId, status);
    const filtered = reports.filter((r) => {
      const groupOk = filters?.group ? r.group === filters.group : true;
      const typeOk = filters?.type ? r.type === filters.type : true;
      return groupOk && typeOk;
    });
    return filtered.map((r) => this.toReportDto(r));
  }

  async markSubmitted(ctx: TaxStrategyContext, id: string): Promise<TaxReportDto> {
    const report = await this.reportRepo.markSubmitted(ctx.tenantId, id, new Date());
    return this.toReportDto(report);
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
}
