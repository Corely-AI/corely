import { Injectable } from "@nestjs/common";
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

@RequireTenant()
@Injectable()
export class DeleteTaxFilingUseCase extends BaseUseCase<string, { deleted: boolean }> {
  constructor(private readonly reportRepo: TaxReportRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    filingId: string,
    ctx: UseCaseContext
  ): Promise<Result<{ deleted: boolean }, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }
    if (!["OPEN", "UPCOMING"].includes(report.status)) {
      return err(new ConflictError("Only draft filings can be deleted"));
    }
    await this.reportRepo.delete(workspaceId, filingId);
    return ok({ deleted: true });
  }
}
