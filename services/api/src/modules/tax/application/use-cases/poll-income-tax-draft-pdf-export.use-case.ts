import { Injectable } from "@nestjs/common";
import { type PollIncomeTaxDraftPdfExportOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ValidationError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  isErr,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { IncomeTaxDraftSupportService } from "../services/income-tax-draft-support.service";
import { RequestTaxReportPdfUseCase } from "./request-tax-report-pdf.use-case";
import { getIncomeTaxDraftReportById } from "./income-tax-draft-report.helpers";

export type PollIncomeTaxDraftPdfExportUseCaseInput = {
  draftId: string;
  exportId: string;
};

@RequireTenant()
@Injectable()
export class PollIncomeTaxDraftPdfExportUseCase extends BaseUseCase<
  PollIncomeTaxDraftPdfExportUseCaseInput,
  PollIncomeTaxDraftPdfExportOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService,
    private readonly requestTaxReportPdfUseCase: RequestTaxReportPdfUseCase
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: PollIncomeTaxDraftPdfExportUseCaseInput,
    ctx: UseCaseContext
  ): Promise<Result<PollIncomeTaxDraftPdfExportOutput, UseCaseError>> {
    if (input.exportId !== input.draftId) {
      throw new ValidationError(
        "Export id must match the draft id for income tax draft PDF polling.",
        { draftId: input.draftId, exportId: input.exportId }
      );
    }

    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId: input.draftId,
    });

    await this.support.assertSupported({
      workspaceId,
      year: report.periodStart.getUTCFullYear(),
    });

    const result = await this.requestTaxReportPdfUseCase.execute({ reportId: report.id }, ctx);
    if (isErr(result)) {
      return result;
    }

    return ok({
      exportId: report.id,
      status: result.value.status,
      downloadUrl: result.value.downloadUrl,
      expiresAt: result.value.expiresAt,
      retryAfterMs: result.value.retryAfterMs,
    });
  }
}
