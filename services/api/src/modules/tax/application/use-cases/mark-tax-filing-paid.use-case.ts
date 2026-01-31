import { Injectable } from "@nestjs/common";
import {
  type MarkTaxFilingPaidRequest,
  type MarkTaxFilingPaidResponse,
  type DocumentLinkEntityType,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ConflictError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";
import { DocumentsApplication } from "../../../documents/application/documents.application";

export type MarkTaxFilingPaidInput = {
  filingId: string;
  request: MarkTaxFilingPaidRequest;
};

@RequireTenant()
@Injectable()
export class MarkTaxFilingPaidUseCase extends BaseUseCase<
  MarkTaxFilingPaidInput,
  MarkTaxFilingPaidResponse
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly detailUseCase: GetTaxFilingDetailUseCase,
    private readonly documentsApp: DocumentsApplication
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: MarkTaxFilingPaidInput,
    ctx: UseCaseContext
  ): Promise<Result<MarkTaxFilingPaidResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    if (report.status !== "SUBMITTED") {
      return err(new ConflictError("Filing must be submitted before marking paid"));
    }

    if (input.request.proofDocumentId) {
      const linkResult = await this.documentsApp.linkDocument.execute(
        {
          documentId: input.request.proofDocumentId,
          entityType: "OTHER" as DocumentLinkEntityType,
          entityId: input.filingId,
        },
        ctx
      );
      if ("error" in linkResult) {
        return linkResult;
      }
    }

    await this.reportRepo.markPaid({
      tenantId: workspaceId,
      reportId: input.filingId,
      paidAt: new Date(input.request.paidAt),
      amountCents: input.request.amountCents,
      method: input.request.method,
      proofDocumentId: input.request.proofDocumentId ?? null,
    });

    const refreshed = await this.detailUseCase.execute(input.filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }
}
