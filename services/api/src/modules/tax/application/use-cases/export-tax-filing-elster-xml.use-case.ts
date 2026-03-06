import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  ConflictError,
  ForbiddenError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
  ValidationError,
  RequireTenant,
} from "@corely/kernel";
import { TaxProfileRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";
import {
  TAX_FILING_EXPORT_BUILDER_PORT,
  type TaxFilingExportBuilderPort,
} from "../ports/tax-filing-export-builder.port";
import {
  buildTaxFilingExportInput,
  type TaxFilingBinaryExportResult,
} from "./tax-filing-export.utils";
import { resolveTaxFilingExportEligibility } from "../services/tax-filing-export-eligibility";

@RequireTenant()
@Injectable()
export class ExportTaxFilingElsterXmlUseCase extends BaseUseCase<
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

    if (!eligibility.exports.canExportElsterXml) {
      if (eligibility.elsterXmlBlockReason === "Tax:JurisdictionUnsupported") {
        return err(
          new ValidationError(
            "ELSTER XML export is currently available only for DE filings.",
            undefined,
            "Tax:JurisdictionUnsupported"
          )
        );
      }
      if (eligibility.elsterXmlBlockReason === "Tax:FilingNotReadyForExport") {
        return err(
          new ConflictError(
            "Filing is not ready for ELSTER XML export. Recalculate first.",
            undefined,
            "Tax:FilingNotReadyForExport"
          )
        );
      }
      return err(
        new ValidationError(
          "ELSTER XML export is available for periodic VAT filings only.",
          undefined,
          "Tax:ExportNotSupported"
        )
      );
    }

    const exportInput = buildTaxFilingExportInput(filing, eligibility.jurisdiction);
    const builtXml = this.exportBuilder.buildElsterXml(exportInput);

    return ok({
      kind: "ELSTER_USTVA_XML",
      content: builtXml.xmlString,
      fileName: builtXml.fileName,
      mimeType: builtXml.mimeType,
      encoding: builtXml.encoding,
    });
  }
}
