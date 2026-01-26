import { Injectable } from "@nestjs/common";
import type {
  ListVatPeriodsInput,
  ListVatPeriodsOutput,
  VatPeriodSummaryDto,
  TaxTotalsByKind,
} from "@corely/contracts";
import type { UseCaseContext } from "./use-case-context";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort, TaxReportRepoPort } from "../../domain/ports";

@Injectable()
export class ListVatPeriodsUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxReportRepo: TaxReportRepoPort
  ) {}

  async execute(input: ListVatPeriodsInput, ctx: UseCaseContext): Promise<ListVatPeriodsOutput> {
    const now = new Date();
    const year =
      input.year ?? (input.from ? new Date(input.from).getUTCFullYear() : now.getUTCFullYear());
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const periods = this.periodResolver.getQuartersOfYear(year);
    const summaries: VatPeriodSummaryDto[] = [];

    const profile = await this.taxProfileRepo.getActive(ctx.workspaceId, now);
    const method = profile?.vatAccountingMethod ?? "IST";
    const currency = profile?.currency ?? "EUR";

    const reports = await this.taxReportRepo.listByPeriodRange(
      ctx.workspaceId,
      "VAT_ADVANCE",
      yearStart,
      yearEnd
    );

    const reportByKey = new Map(
      reports.map((report) => [this.periodResolver.resolveQuarter(report.periodStart).key, report])
    );

    for (const p of periods) {
      if (input.from && p.end <= new Date(input.from)) continue;
      if (input.to && p.start >= new Date(input.to)) continue;

      const inputs = await this.vatPeriodQuery.getInputs(ctx.workspaceId, p.start, p.end, method);
      const salesGrossCents = inputs.salesNetCents + inputs.salesVatCents;
      const purchaseGrossCents = inputs.purchaseNetCents + inputs.purchaseVatCents;
      const taxDueCents = inputs.salesVatCents - inputs.purchaseVatCents;

      const totalsByKind: TaxTotalsByKind = {
        STANDARD: {
          netAmountCents: inputs.salesNetCents,
          taxAmountCents: inputs.salesVatCents,
          grossAmountCents: salesGrossCents,
          rateBps: 1900,
        },
      };

      const report = reportByKey.get(p.key) ?? null;
      const finalizedStatuses = ["SUBMITTED", "PAID", "NIL", "ARCHIVED"];
      const status =
        report && finalizedStatuses.includes(report.status)
          ? report.status
          : now >= p.end
            ? "OVERDUE"
            : "OPEN";

      summaries.push({
        id: p.key,
        tenantId: ctx.tenantId,
        periodKey: p.key,
        periodStart: p.start.toISOString(),
        periodEnd: p.end.toISOString(),
        currency,
        salesNetCents: inputs.salesNetCents,
        salesVatCents: inputs.salesVatCents,
        salesGrossCents,
        purchaseNetCents: inputs.purchaseNetCents,
        purchaseVatCents: inputs.purchaseVatCents,
        purchaseGrossCents,
        taxDueCents,
        totalsByKind,
        generatedAt: now.toISOString(),
        status: status as any,
        submissionDate: report?.submittedAt?.toISOString() ?? null,
        submissionReference: report?.submissionReference ?? null,
        submissionNotes: report?.submissionNotes ?? null,
        archivedReason: report?.archivedReason ?? null,
        pdfStorageKey: report?.pdfStorageKey ?? null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    return { periods: summaries };
  }
}
