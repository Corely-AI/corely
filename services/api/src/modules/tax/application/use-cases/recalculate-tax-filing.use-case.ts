import { Injectable } from "@nestjs/common";
import { type RecalculateTaxFilingResponse } from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";

@RequireTenant()
@Injectable()
export class RecalculateTaxFilingUseCase extends BaseUseCase<string, RecalculateTaxFilingResponse> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly detailUseCase: GetTaxFilingDetailUseCase
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    filingId: string,
    ctx: UseCaseContext
  ): Promise<Result<RecalculateTaxFilingResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    const meta = {
      ...(report.meta ?? {}),
      lastRecalculatedAt: new Date().toISOString(),
    };
    await this.reportRepo.updateMeta({ tenantId: workspaceId, reportId: filingId, meta });

    const refreshed = await this.detailUseCase.execute(filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }
}
