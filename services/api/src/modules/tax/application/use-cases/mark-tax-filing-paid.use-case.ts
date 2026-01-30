import { Injectable } from "@nestjs/common";
import { type MarkTaxFilingPaidRequest, type MarkTaxFilingPaidResponse } from "@corely/contracts";
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
    private readonly detailUseCase: GetTaxFilingDetailUseCase
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
