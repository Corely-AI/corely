import { Injectable, Inject } from "@nestjs/common";
import type { GenerateExciseReportInput, GenerateExciseReportOutput } from "@corely/contracts";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  err,
  ValidationError,
  RequireTenant,
} from "@corely/kernel";
import { TaxSnapshotRepoPort } from "../../domain/ports/tax-snapshot-repo.port";
import { TaxReportRepoPort } from "../../domain/ports/tax-report-repo.port";
import type { TaxReportEntity } from "../../domain/entities/tax-report.entity";

type Deps = {
  logger: LoggerPort;
  snapshotRepo: TaxSnapshotRepoPort;
  reportRepo: TaxReportRepoPort;
};

/**
 * Generates a monthly excise report by aggregating excise amounts from invoices
 * Excise is a special tax on specific products (alcohol, tobacco, fuel, etc.)
 */
@RequireTenant()
@Injectable()
export class GenerateExciseReportUseCase extends BaseUseCase<
  GenerateExciseReportInput,
  GenerateExciseReportOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GenerateExciseReportInput,
    ctx: UseCaseContext
  ): Promise<Result<GenerateExciseReportOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    // Parse dates
    const periodStart = new Date(input.periodStart);
    const periodEnd = new Date(input.periodEnd);

    // Validate date range
    if (periodStart >= periodEnd) {
      return err(
        new ValidationError("Invalid period", {
          errors: { periodStart: "Start date must be before end date" },
        })
      );
    }

    // Query all invoice tax snapshots for the period
    const snapshots = await this.deps.snapshotRepo.findByPeriod(
      tenantId,
      periodStart,
      periodEnd,
      "INVOICE"
    );

    // Calculate total excise collected
    // Note: In current implementation, excise is not separately tracked in TaxBreakdownDto
    // For MVP, we extract excise from breakdown metadata or use a placeholder
    // TODO: Enhance tax calculation to separately track excise amounts
    let totalExciseCents = 0;
    const lineItems: Array<{
      section: string;
      label: string;
      netAmountCents: number;
      taxAmountCents: number;
      meta: Record<string, any>;
    }> = [];

    for (const snapshot of snapshots) {
      try {
        const breakdown = JSON.parse(snapshot.breakdownJson);

        // Extract excise from breakdown metadata if available
        // This is a placeholder - actual implementation would parse catalog excise data
        const exciseAmount = (breakdown.meta?.exciseCents as number) || 0;
        totalExciseCents += exciseAmount;

        if (exciseAmount > 0) {
          lineItems.push({
            section: "Excise Collected",
            label: `Invoice ${snapshot.sourceId}`,
            netAmountCents: snapshot.subtotalAmountCents,
            taxAmountCents: exciseAmount,
            meta: {
              invoiceId: snapshot.sourceId,
              calculatedAt: snapshot.calculatedAt.toISOString(),
            },
          });
        }
      } catch (error) {
        this.deps.logger.warn("Failed to parse tax breakdown", {
          snapshotId: snapshot.id,
          error,
        });
      }
    }

    // Generate period label (e.g., "2024-01")
    const periodLabel = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`;

    // Due date is typically 15th of following month for excise reports
    const dueDate = new Date(periodEnd);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(15);

    // Create or update excise report
    const report = await this.deps.reportRepo.upsertByPeriod({
      tenantId,
      type: "EXCISE_MONTHLY",
      group: "EXCISE",
      periodLabel,
      periodStart,
      periodEnd,
      dueDate,
      status: totalExciseCents > 0 ? "OPEN" : "NIL",
      amountFinalCents: totalExciseCents,
      submissionReference: null,
      submissionNotes: null,
      archivedReason: null,
      submittedAt: null,
      pdfStorageKey: null,
    });

    // Convert entity to DTO
    const reportDto = this.toDto(report, lineItems);

    return ok({ report: reportDto });
  }

  private toDto(
    entity: TaxReportEntity,
    lines: Array<{
      section: string;
      label: string;
      netAmountCents: number;
      taxAmountCents: number;
      meta: Record<string, any>;
    }>
  ): GenerateExciseReportOutput["report"] {
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
      amountEstimatedCents: entity.amountEstimatedCents,
      amountFinalCents: entity.amountFinalCents ?? null,
      currency: entity.currency,
      submittedAt: entity.submittedAt?.toISOString() ?? null,
      submissionReference: entity.submissionReference ?? null,
      submissionNotes: entity.submissionNotes ?? null,
      archivedReason: entity.archivedReason ?? null,
      pdfStorageKey: entity.pdfStorageKey ?? null,
      pdfGeneratedAt: entity.pdfGeneratedAt?.toISOString() ?? null,
      meta: entity.meta ?? null,
      lines: lines.map((line) => ({
        section: line.section,
        label: line.label,
        netAmountCents: line.netAmountCents,
        taxAmountCents: line.taxAmountCents,
        meta: line.meta,
      })),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
