import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ForbiddenError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxProfileRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";
import {
  TAX_FILING_EXPORT_BUILDER_PORT,
  buildTaxFilingExportBaseName,
  type TaxFilingExportBuilderPort,
} from "../ports/tax-filing-export-builder.port";
import {
  buildTaxFilingExportInput,
  isSupportedCsvFilingType,
  type TaxFilingBinaryExportResult,
} from "./tax-filing-export.utils";
import { resolveTaxFilingExportEligibility } from "../services/tax-filing-export-eligibility";

@RequireTenant()
@Injectable()
export class ExportTaxFilingKennzifferCsvUseCase extends BaseUseCase<
  string,
  TaxFilingBinaryExportResult
> {
  constructor(
    private readonly getTaxFilingDetailUseCase: GetTaxFilingDetailUseCase,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    @Inject(TAX_FILING_EXPORT_BUILDER_PORT)
    private readonly exportBuilder: TaxFilingExportBuilderPort
  ) {
    super({});
  }

  protected async handle(
    filingId: string,
    ctx: UseCaseContext
  ): Promise<Result<TaxFilingBinaryExportResult, UseCaseError>> {
    if (!ctx.userId) {
      return err(new ForbiddenError("Forbidden", undefined, "Tax:Forbidden"));
    }

    const detailResult = await this.getTaxFilingDetailUseCase.execute(filingId, ctx);
    if ("error" in detailResult) {
      return detailResult;
    }

    const filing = detailResult.value.filing;
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const profileAt = filing.periodEnd ? new Date(filing.periodEnd) : new Date();
    const profile = await this.taxProfileRepo.getActive(workspaceId, profileAt);
    const jurisdiction = profile?.country ?? "";

    const eligibility = resolveTaxFilingExportEligibility({
      filingType: filing.type,
      jurisdiction,
      lastRecalculatedAt: filing.totals?.lastRecalculatedAt,
    });

    if (!eligibility.exports.canExportKennzifferCsv) {
      if (eligibility.kennzifferCsvBlockReason === "Tax:JurisdictionUnsupported") {
        return err(
          new ValidationError(
            "Kennziffer CSV export is currently available only for DE filings.",
            undefined,
            "Tax:JurisdictionUnsupported"
          )
        );
      }
      return err(
        new ValidationError(
          "Kennziffer CSV export is available for VAT filings only.",
          undefined,
          "Tax:ExportNotSupported"
        )
      );
    }

    if (!isSupportedCsvFilingType(filing.type)) {
      return err(
        new ValidationError(
          "Kennziffer CSV export is available for VAT filings only.",
          undefined,
          "Tax:ExportNotSupported"
        )
      );
    }

    const exportInput = buildTaxFilingExportInput(filing, eligibility.jurisdiction);
    const rows = this.exportBuilder.buildKennzifferMap(exportInput);
    const csv = this.toCsv(rows);
    const baseName = buildTaxFilingExportBaseName({
      filingType: filing.type,
      periodLabel: filing.periodLabel,
      periodKey: filing.periodKey,
      year: filing.year,
    });

    return ok({
      kind: "USTVA_KENNZIFFER_CSV",
      content: csv,
      fileName: `${baseName}-kennziffer.csv`,
      mimeType: "text/csv",
      encoding: "utf-8",
    });
  }

  private toCsv(rows: Array<{ kennziffer: string; label: string; value: string }>): string {
    const header = "kennziffer,label,value";
    const lines = rows.map((row) =>
      [row.kennziffer, row.label, row.value].map((value) => this.escapeCsv(value)).join(",")
    );
    return [header, ...lines, ""].join("\n");
  }

  private escapeCsv(value: string): string {
    if (!/[",\n]/.test(value)) {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  }
}
