import { Injectable } from "@nestjs/common";
import type {
  AttachTaxFilingPaymentProofRequest,
  AttachTaxFilingPaymentProofResponse,
  DocumentLinkEntityType,
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
import { DocumentsApplication } from "../../../documents/application/documents.application";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";

export type AttachTaxFilingPaymentProofInput = {
  filingId: string;
  request: AttachTaxFilingPaymentProofRequest;
};

@RequireTenant()
@Injectable()
export class AttachTaxFilingPaymentProofUseCase extends BaseUseCase<
  AttachTaxFilingPaymentProofInput,
  AttachTaxFilingPaymentProofResponse
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly documentsApp: DocumentsApplication,
    private readonly detailUseCase: GetTaxFilingDetailUseCase
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: AttachTaxFilingPaymentProofInput,
    ctx: UseCaseContext
  ): Promise<Result<AttachTaxFilingPaymentProofResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    if (report.status !== "PAID") {
      return err(new ConflictError("Filing must be paid before attaching a receipt"));
    }

    const paymentMeta = report.meta?.payment;
    if (!paymentMeta || typeof paymentMeta !== "object") {
      return err(new ConflictError("Payment details missing for filing"));
    }
    const paidAt = (paymentMeta as { paidAt?: string }).paidAt;
    if (!paidAt) {
      return err(new ConflictError("Payment date missing for filing"));
    }

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

    const updatedMeta = {
      ...(report.meta ?? {}),
      payment: {
        ...paymentMeta,
        proofDocumentId: input.request.proofDocumentId,
      },
    };

    await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: input.filingId,
      meta: updatedMeta,
    });

    const refreshed = await this.detailUseCase.execute(input.filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }
}
