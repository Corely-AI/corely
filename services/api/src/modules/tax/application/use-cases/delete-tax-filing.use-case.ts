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
import { TaxFilingStatus, dbStatusToFilingStatus } from "../../domain/entities/tax-filing-status";

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
      return err(new NotFoundError("Filing not found", { code: "Tax:FilingNotFound" }));
    }

    // Domain guard: only DRAFT filings can be deleted.
    const currentStatus = dbStatusToFilingStatus(report.status);
    if (currentStatus !== TaxFilingStatus.DRAFT) {
      return err(new ConflictError("Only draft filings can be deleted"));
    }

    await this.reportRepo.delete(workspaceId, filingId);
    return ok({ deleted: true });
  }
}
