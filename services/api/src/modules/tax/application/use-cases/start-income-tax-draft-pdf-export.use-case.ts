import { Injectable } from "@nestjs/common";
import { type StartIncomeTaxDraftPdfExportOutput } from "@corely/contracts";
import {
  BaseUseCase,
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

@RequireTenant()
@Injectable()
export class StartIncomeTaxDraftPdfExportUseCase extends BaseUseCase<
  string,
  StartIncomeTaxDraftPdfExportOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService,
    private readonly requestTaxReportPdfUseCase: RequestTaxReportPdfUseCase
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    draftId: string,
    ctx: UseCaseContext
  ): Promise<Result<StartIncomeTaxDraftPdfExportOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId,
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
