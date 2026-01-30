import { Injectable } from "@nestjs/common";
import { CreateTaxFilingInput, CreateTaxFilingOutput } from "@corely/contracts";
import { TaxReportRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class CreateTaxFilingUseCase extends BaseUseCase<
  CreateTaxFilingInput,
  CreateTaxFilingOutput
> {
  constructor(
    private readonly taxReportRepo: TaxReportRepoPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly periodResolver: VatPeriodResolver
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: CreateTaxFilingInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateTaxFilingOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    // 1. Validate Input
    if (input.type === "VAT" && !input.periodKey) {
      return err({
        code: "INVALID_INPUT",
        message: "Period key is required for VAT filings",
      });
    }

    // 2. Resolve Dates
    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;
    let mapType = "VAT_ADVANCE"; // Default for VAT

    if (input.type === "VAT" && input.periodKey) {
      // Assume quarterly for now or parse key
      // TODO: Handle monthly keys if needed
      const period = this.periodResolver.resolveQuarter(input.periodKey);
      periodStart = period.start;
      periodEnd = period.end;
      periodLabel = period.label;
    } else {
      // Annual types
      const year = input.year;
      periodStart = new Date(Date.UTC(year, 0, 1));
      periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      periodLabel = year.toString();

      if (input.type === "INCOME_TAX_ANNUAL") {mapType = "INCOME_TAX";}
      // ... map other types
    }

    // 3. Check for duplicates
    // Using existing list logic style or dedicated check
    // Ideally repo has exists method, using list for now
    const existing = await this.taxReportRepo.listByPeriodRange(
      workspaceId,
      mapType,
      periodStart,
      periodEnd // This range check might be loose, but acceptable for MVP
    );
    // Strict duplication check?
    // Repo usually handles this via unique constraint or domain check.
    // For now assuming we just create a new one or return existing if idempotent.

    // 4. Create (Upsert)
    // We use upsertByPeriod which is the standard way to create/update reports in this domain
    const dueDate = new Date(periodEnd);
    dueDate.setUTCDate(10); // Simple default rule, should ideally use strategy

    const newReport = await this.taxReportRepo.upsertByPeriod({
      tenantId: workspaceId,
      type: mapType,
      group: "tax", // Default group? check entities for valid groups. Assuming 'tax' or derived.
      periodLabel,
      periodStart,
      periodEnd,
      dueDate,
      status: "DRAFT",
      // optional fields
      amountFinalCents: null,
      submissionReference: null,
      submissionNotes: input.metadata ? JSON.stringify(input.metadata) : null,
    });

    return ok({
      id: newReport.id,
    });
  }
}
