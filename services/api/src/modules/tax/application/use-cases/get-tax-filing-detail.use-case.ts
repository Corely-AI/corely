import { Injectable } from "@nestjs/common";
import {
  TaxIssueSchema,
  type IncomeTaxTotals,
  type TaxFilingDetailResponse,
  type TaxFilingStatus,
  type TaxFilingType,
  type TaxIssue,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort, TaxSnapshotRepoPort } from "../../domain/ports";
import type { TaxReportEntity } from "../../domain/entities";
import { TaxCapabilitiesService } from "../services/tax-capabilities.service";

@RequireTenant()
@Injectable()
export class GetTaxFilingDetailUseCase extends BaseUseCase<string, TaxFilingDetailResponse> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly snapshotRepo: TaxSnapshotRepoPort,
    private readonly capabilitiesService: TaxCapabilitiesService
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    id: string,
    ctx: UseCaseContext
  ): Promise<Result<TaxFilingDetailResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, id);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    const status = this.mapReportStatus(report);
    const issues = this.resolveIssues(report.meta);
    const totals = await this.computeTotals(report, workspaceId);

    const capabilities = await this.capabilitiesService.getCapabilities();

    const filing = {
      id: report.id,
      type: this.mapReportTypeToFilingType(report.type),
      status,
      periodLabel: report.periodLabel,
      year: report.periodStart.getUTCFullYear(),
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      dueDate: report.dueDate.toISOString(),
      totals,
      issues,
      submission:
        report.submittedAt && report.submissionReference
          ? {
              method:
                typeof report.meta?.submission === "object" &&
                report.meta?.submission &&
                "method" in report.meta.submission
                  ? String((report.meta.submission as { method?: string }).method ?? "manual")
                  : "manual",
              submissionId: report.submissionReference,
              submittedAt: report.submittedAt.toISOString(),
              notes: report.submissionNotes ?? undefined,
            }
          : undefined,
      payment: this.resolvePayment(report.meta),
      capabilities: {
        canDelete: this.canDelete(report),
        canRecalculate: !["ARCHIVED", "PAID"].includes(report.status),
        canSubmit: this.canSubmit(report, issues),
        canMarkPaid: report.status === "SUBMITTED",
        paymentsEnabled: capabilities.paymentsEnabled,
      },
    };

    return ok({ filing });
  }

  private mapReportTypeToFilingType(type: string): TaxFilingType {
    switch (type) {
      case "VAT_ADVANCE":
        return "vat";
      case "VAT_ANNUAL":
        return "vat-annual";
      case "INCOME_TAX":
        return "income-annual";
      case "PAYROLL_TAX":
        return "payroll";
      case "TRADE_TAX":
        return "trade";
      case "BALANCE_SHEET":
      case "PROFIT_LOSS":
        return "year-end";
      default:
        return "other";
    }
  }

  private mapReportStatus(report: TaxReportEntity): TaxFilingStatus {
    if (report.status === "PAID") {
      return "paid";
    }
    if (report.status === "SUBMITTED" || report.status === "NIL") {
      return "submitted";
    }
    if (report.status === "ARCHIVED") {
      return "archived";
    }
    if (report.status === "OVERDUE") {
      return "needsFix";
    }
    if (new Date() > report.dueDate) {
      return "needsFix";
    }
    return "draft";
  }

  private resolveIssues(meta?: Record<string, any> | null): TaxIssue[] {
    const rawIssues = Array.isArray(meta?.issues) ? meta?.issues : [];
    return rawIssues
      .map((issue) => {
        const parsed = TaxIssueSchema.safeParse(issue);
        return parsed.success ? parsed.data : null;
      })
      .filter((issue): issue is TaxIssue => Boolean(issue));
  }

  private resolvePayment(meta?: Record<string, any> | null) {
    const paymentMeta = meta?.payment;
    if (!paymentMeta || typeof paymentMeta !== "object") {
      return undefined;
    }
    const paidAt = (paymentMeta as { paidAt?: string }).paidAt;
    if (!paidAt) {
      return undefined;
    }
    return {
      paidAt,
      method: String((paymentMeta as { method?: string }).method ?? "manual"),
      amountCents: Number((paymentMeta as { amountCents?: number }).amountCents ?? 0),
      proofDocumentId: (paymentMeta as { proofDocumentId?: string }).proofDocumentId ?? undefined,
    };
  }

  private async computeTotals(
    report: TaxReportEntity,
    workspaceId: string
  ): Promise<IncomeTaxTotals | undefined> {
    const filingType = this.mapReportTypeToFilingType(report.type);
    if (filingType !== "income-annual") {
      return undefined;
    }

    const [incomeSnapshots, expenseSnapshots] = await Promise.all([
      this.snapshotRepo.findByPeriod(workspaceId, report.periodStart, report.periodEnd, "INVOICE"),
      this.snapshotRepo.findByPeriod(workspaceId, report.periodStart, report.periodEnd, "EXPENSE"),
    ]);

    const grossIncomeCents = incomeSnapshots.reduce((sum, snap) => sum + snap.totalAmountCents, 0);
    const deductibleExpensesCents = expenseSnapshots.reduce(
      (sum, snap) => sum + snap.totalAmountCents,
      0
    );
    const netProfitCents = grossIncomeCents - deductibleExpensesCents;

    const lastRecalculatedAt =
      typeof report.meta?.lastRecalculatedAt === "string"
        ? report.meta.lastRecalculatedAt
        : undefined;

    return {
      grossIncomeCents,
      deductibleExpensesCents,
      netProfitCents,
      estimatedTaxDueCents: null,
      currency: report.currency,
      lastRecalculatedAt: lastRecalculatedAt ?? undefined,
    };
  }

  private canDelete(report: TaxReportEntity): boolean {
    return ["OPEN", "UPCOMING"].includes(report.status);
  }

  private canSubmit(report: TaxReportEntity, issues: TaxIssue[]): boolean {
    if (!["OPEN", "UPCOMING", "OVERDUE"].includes(report.status)) {
      return false;
    }
    return !issues.some((issue) => issue.severity === "blocker");
  }
}
