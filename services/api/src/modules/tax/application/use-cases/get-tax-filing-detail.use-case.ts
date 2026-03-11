import { Inject, Injectable } from "@nestjs/common";
import {
  TaxIssueSchema,
  type TaxFilingTotals,
  type TaxFilingDetailResponse,
  type TaxFilingReportSummary,
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
import { TaxProfileRepoPort, TaxReportRepoPort, TaxSnapshotRepoPort } from "../../domain/ports";
import { TaxEricJobRepoPort, TaxReportSectionRepoPort } from "../../domain/ports";
import type { TaxReportEntity } from "../../domain/entities";
import { TaxCapabilitiesService } from "../services/tax-capabilities.service";
import { resolveTaxFilingExportEligibility } from "../services/tax-filing-export-eligibility";
import {
  ANNUAL_INCOME_SECTION_KEY,
  buildAnnualIncomeReportSummary,
} from "../services/annual-income-report.service";
import {
  TAX_ELSTER_GATEWAY_PORT,
  type TaxElsterGatewayPort,
} from "../ports/tax-elster-gateway.port";

@RequireTenant()
@Injectable()
export class GetTaxFilingDetailUseCase extends BaseUseCase<string, TaxFilingDetailResponse> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly snapshotRepo: TaxSnapshotRepoPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly capabilitiesService: TaxCapabilitiesService,
    private readonly reportSectionRepo: TaxReportSectionRepoPort,
    private readonly ericJobRepo: TaxEricJobRepoPort,
    @Inject(TAX_ELSTER_GATEWAY_PORT) private readonly elsterGateway: TaxElsterGatewayPort
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

    const issues = this.resolveIssues(report.meta);
    const status = this.mapReportStatus(report, issues);
    const totals = await this.computeTotals(report, workspaceId);
    const profile = await this.taxProfileRepo.getActive(workspaceId, report.periodEnd);
    const exportEligibility = resolveTaxFilingExportEligibility({
      filingType: this.mapReportTypeToFilingType(report.type),
      jurisdiction: profile?.country ?? "",
      lastRecalculatedAt: totals?.lastRecalculatedAt,
    });

    const capabilities = await this.capabilitiesService.getCapabilities(workspaceId);
    const reports = await this.resolveReportSummaries(report, workspaceId);
    const periodKey = this.resolvePeriodKey(report);
    const filingType = this.mapReportTypeToFilingType(report.type);
    const submissionConnectionStatus = this.elsterGateway.getConnectionStatus();
    const submissionMethods: Array<"manual" | "elster" | "api"> =
      report.type === "VAT_ADVANCE" && submissionConnectionStatus === "connected"
        ? ["manual", "elster"]
        : ["manual"];

    const filing = {
      id: report.id,
      type: filingType,
      status,
      periodLabel: report.periodLabel,
      periodKey,
      year: report.periodStart.getUTCFullYear(),
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      dueDate: report.dueDate.toISOString(),
      totals,
      issues,
      submission:
        report.submittedAt && report.submissionReference
          ? {
              method: this.resolveSubmissionMethod(report.meta),
              submissionId: report.submissionReference,
              submittedAt: report.submittedAt.toISOString(),
              notes: report.submissionNotes ?? undefined,
              evidence: this.resolveSubmissionEvidence(report.meta),
            }
          : undefined,
      payment: this.resolvePayment(report.meta),
      paymentInstructions: this.resolvePaymentInstructions(report.meta),
      exports: exportEligibility.exports,
      reports,
      capabilities: {
        canDelete: this.canDelete(status),
        canRecalculate: !["archived", "paid", "submitted"].includes(status),
        canSubmit: this.canSubmit(status, issues),
        canMarkPaid: status === "submitted",
        paymentsEnabled: capabilities.paymentsEnabled,
        submissionMethods,
        submissionConnectionStatus,
      },
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };

    return ok({ filing });
  }

  private async resolveReportSummaries(
    report: TaxReportEntity,
    workspaceId: string
  ): Promise<TaxFilingReportSummary[] | undefined> {
    if (report.type !== "INCOME_TAX") {
      return undefined;
    }

    const [section, jobs] = await Promise.all([
      this.reportSectionRepo.findByReportAndSection({
        tenantId: workspaceId,
        reportId: report.id,
        sectionKey: ANNUAL_INCOME_SECTION_KEY,
      }),
      this.ericJobRepo.listByReport({
        tenantId: workspaceId,
        reportId: report.id,
      }),
    ]);

    return [
      buildAnnualIncomeReportSummary({
        reportId: report.id,
        section,
        jobs,
        fallbackUpdatedAt: report.updatedAt,
      }),
    ];
  }

  private resolvePeriodKey(report: TaxReportEntity): string | undefined {
    const filingType = this.mapReportTypeToFilingType(report.type);
    if (filingType !== "vat") {
      return undefined;
    }

    const quarterMatch = report.periodLabel.match(/Q([1-4])/i);
    if (quarterMatch) {
      return `${report.periodStart.getUTCFullYear()}-Q${quarterMatch[1]}`;
    }

    const startMonth = report.periodStart.getUTCMonth() + 1;
    const month = String(startMonth).padStart(2, "0");
    return `${report.periodStart.getUTCFullYear()}-${month}`;
  }

  private resolveSubmissionMethod(meta: TaxReportEntity["meta"]): "manual" | "elster" | "api" {
    const submissionValue =
      typeof meta?.submission === "object" && meta?.submission
        ? (meta.submission as { method?: unknown }).method
        : undefined;

    if (submissionValue === "elster" || submissionValue === "api") {
      return submissionValue;
    }
    return "manual";
  }

  private resolveSubmissionEvidence(meta: TaxReportEntity["meta"]) {
    const submissionValue =
      typeof meta?.submission === "object" && meta?.submission
        ? (meta.submission as { evidence?: unknown }).evidence
        : undefined;

    if (!submissionValue || typeof submissionValue !== "object") {
      return undefined;
    }

    const candidate = submissionValue as Record<string, unknown>;
    return {
      transferReference:
        typeof candidate.transferReference === "string" ? candidate.transferReference : undefined,
      gatewayVersion:
        typeof candidate.gatewayVersion === "string" ? candidate.gatewayVersion : undefined,
      ericVersion: typeof candidate.ericVersion === "string" ? candidate.ericVersion : undefined,
      certificateReferenceId:
        typeof candidate.certificateReferenceId === "string"
          ? candidate.certificateReferenceId
          : undefined,
    };
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

  private mapReportStatus(report: TaxReportEntity, issues: TaxIssue[]): TaxFilingStatus {
    if (report.status === "PAID") {
      return "paid";
    }
    if (report.status === "SUBMITTED" || report.status === "NIL") {
      return "submitted";
    }
    if (report.status === "ARCHIVED") {
      return "archived";
    }

    const hasBlockers = issues.some((issue) => issue.severity === "blocker");
    if (report.status === "OVERDUE" || new Date() > report.dueDate || hasBlockers) {
      return "needsFix";
    }

    if (["OPEN", "UPCOMING"].includes(report.status)) {
      const hasRecalculation =
        typeof report.meta?.lastRecalculatedAt === "string" && report.meta.lastRecalculatedAt;
      if (!hasRecalculation) {
        return "draft";
      }
      return "readyForReview";
    }

    return "draft";
  }

  private resolveIssues(meta?: Record<string, unknown> | null): TaxIssue[] {
    const rawIssues =
      meta && typeof meta === "object" && Array.isArray(meta.issues) ? meta.issues : [];
    return rawIssues
      .map((issue) => {
        const parsed = TaxIssueSchema.safeParse(issue);
        return parsed.success ? parsed.data : null;
      })
      .filter((issue): issue is TaxIssue => Boolean(issue));
  }

  private resolvePayment(meta?: Record<string, unknown> | null) {
    const paymentMeta = meta?.payment;
    if (!paymentMeta || typeof paymentMeta !== "object") {
      return undefined;
    }

    const paidAt = (paymentMeta as { paidAt?: unknown }).paidAt;
    if (typeof paidAt !== "string") {
      return undefined;
    }

    const method = (paymentMeta as { method?: unknown }).method;
    const normalizedMethod: "bank-transfer" | "direct-debit" | "other" | "manual" =
      method === "bank-transfer" || method === "direct-debit" || method === "other"
        ? method
        : "manual";

    const amountCents = (paymentMeta as { amountCents?: unknown }).amountCents;
    const parsedAmount =
      typeof amountCents === "number"
        ? amountCents
        : Number.parseInt(String(amountCents ?? "0"), 10) || 0;

    const proofDocumentId = (paymentMeta as { proofDocumentId?: unknown }).proofDocumentId;
    return {
      paidAt,
      method: normalizedMethod,
      amountCents: parsedAmount,
      proofDocumentId: typeof proofDocumentId === "string" ? proofDocumentId : undefined,
    };
  }

  private resolvePaymentInstructions(meta?: Record<string, unknown> | null) {
    const instructions = meta?.paymentInstructions;
    if (!instructions || typeof instructions !== "object") {
      return undefined;
    }

    const bankName = (instructions as { bankName?: unknown }).bankName;
    const ibanMasked = (instructions as { ibanMasked?: unknown }).ibanMasked;
    const bic = (instructions as { bic?: unknown }).bic;
    const reference = (instructions as { reference?: unknown }).reference;
    return {
      bankName: typeof bankName === "string" ? bankName : undefined,
      ibanMasked: typeof ibanMasked === "string" ? ibanMasked : undefined,
      bic: typeof bic === "string" ? bic : undefined,
      reference: typeof reference === "string" ? reference : undefined,
    };
  }

  private async computeTotals(
    report: TaxReportEntity,
    workspaceId: string
  ): Promise<TaxFilingTotals | undefined> {
    const invoiceDateMode = report.type === "INCOME_TAX" ? "payment" : "document";
    const [invoiceSnapshots, expenseSnapshots] = await Promise.all([
      this.snapshotRepo.findByPeriod(workspaceId, report.periodStart, report.periodEnd, "INVOICE", {
        invoiceDateMode,
      }),
      this.snapshotRepo.findByPeriod(workspaceId, report.periodStart, report.periodEnd, "EXPENSE"),
    ]);

    const vatCollectedCents = invoiceSnapshots.reduce(
      (sum, snap) => sum + snap.taxTotalAmountCents,
      0
    );
    const vatPaidCents = expenseSnapshots.reduce((sum, snap) => sum + snap.taxTotalAmountCents, 0);
    const salesNetCents = invoiceSnapshots.reduce((sum, snap) => sum + snap.subtotalAmountCents, 0);
    const purchaseNetCents = expenseSnapshots.reduce(
      (sum, snap) => sum + snap.subtotalAmountCents,
      0
    );

    const lastRecalculatedAt =
      typeof report.meta?.lastRecalculatedAt === "string" ? report.meta.lastRecalculatedAt : null;

    const totals: TaxFilingTotals = {
      vatCollectedCents,
      vatPaidCents,
      netPayableCents: vatCollectedCents - vatPaidCents,
      currency: report.currency,
      lastRecalculatedAt,
      salesCount: invoiceSnapshots.length,
      purchaseCount: expenseSnapshots.length,
      salesNetCents,
      purchaseNetCents,
    };

    if (this.mapReportTypeToFilingType(report.type) === "income-annual") {
      const grossIncomeCents = invoiceSnapshots.reduce(
        (sum, snap) => sum + snap.totalAmountCents,
        0
      );
      const deductibleExpensesCents = expenseSnapshots.reduce(
        (sum, snap) => sum + snap.totalAmountCents,
        0
      );
      totals.grossIncomeCents = grossIncomeCents;
      totals.deductibleExpensesCents = deductibleExpensesCents;
      totals.netProfitCents = grossIncomeCents - deductibleExpensesCents;
      totals.estimatedTaxDueCents = null;
    }

    return totals;
  }

  private canDelete(status: TaxFilingStatus): boolean {
    return status === "draft";
  }

  private canSubmit(status: TaxFilingStatus, issues: TaxIssue[]): boolean {
    if (!["draft", "readyForReview"].includes(status)) {
      return false;
    }
    return !issues.some((issue) => issue.severity === "blocker");
  }
}
