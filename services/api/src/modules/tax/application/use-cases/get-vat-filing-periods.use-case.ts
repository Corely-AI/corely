import { Injectable } from "@nestjs/common";
import { GetVatPeriodsInput, GetVatPeriodsOutput, VatFrequency } from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxReportRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class GetVatFilingPeriodsUseCase extends BaseUseCase<
  GetVatPeriodsInput,
  GetVatPeriodsOutput
> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxReportRepo: TaxReportRepoPort,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: GetVatPeriodsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetVatPeriodsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;
    const year = input.year;

    // 1. Determine Frequency from Profile
    const profile = await this.taxProfileRepo.getActive(workspaceId, new Date());
    // Default to quarterly if not set or unknown
    const frequency: VatFrequency =
      profile?.filingFrequency === "MONTHLY" ? "monthly" : "quarterly";

    // 2. Generate Periods
    const periods = this.periodResolver.getPeriodsOfYear(year, frequency);

    // 3. Fetch Existing Reports for Status
    const reports = await this.taxReportRepo.listByPeriodRange(
      workspaceId,
      "VAT_ADVANCE",
      new Date(Date.UTC(year, 0, 1)),
      new Date(Date.UTC(year + 1, 0, 1))
    );
    const reportByKey = new Map(
      reports.map((r) => [this.toVatPeriodKey(r.periodStart, frequency), r])
    );

    // 4. Map to Output
    return ok({
      year,
      frequency,
      periods: periods.map((p) => {
        const report = reportByKey.get(p.key);
        let filingId: string | null = null;
        let status: "draft" | "needsFix" | "submitted" | "paid" | "archived" | null = null;

        if (report) {
          filingId = report.id; // Or period key if ID isn't used for detail view? Using key for now based on ListTaxFilings
          // Actually ListTaxFilings uses p.key as ID for VAT. Let's stick to key or report ID?
          // ListTaxFilingsUseCase line 85 says: id: p.key.
          // So "filingId" should probably be the key to navigate to /tax/filings/:key
          // But wait, /tax/filings/:id generally expects a UUID or a unique ID.
          // In ListTaxFilingsUseCase, only for VAT it uses period key as ID.
          filingId = report.id;

          if (report.status === "SUBMITTED" || report.status === "NIL") {
            status = "submitted";
          } else if (report.status === "PAID") {
            status = "paid";
          } else if (report.status === "ARCHIVED") {
            status = "archived";
          } else if (report.status === "OVERDUE") {
            status = "needsFix";
          } else {
            status = "draft";
          }
        } else {
          status = null;
          filingId = null;
        }

        // Override due date logic consistent with list-tax-filings
        const dueDate = new Date(p.end);
        dueDate.setUTCDate(10);

        return {
          periodKey: p.key,
          label: p.label,
          from: p.start.toISOString(),
          to: p.end.toISOString(),
          dueDate: dueDate.toISOString(), // Always provide expected due date
          filingId,
          status,
        };
      }),
    });
  }

  private toVatPeriodKey(date: Date, frequency: VatFrequency) {
    if (frequency === "monthly") {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }
    return this.periodResolver.resolveQuarter(date).key;
  }
}
