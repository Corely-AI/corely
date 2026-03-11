import { Injectable } from "@nestjs/common";
import type { GetTaxEricJobOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxEricJobRepoPort, TaxReportRepoPort } from "../../domain/ports";
import { toTaxEricJobDto } from "./tax-reporting.helpers";

@RequireTenant()
@Injectable()
export class GetTaxEricJobUseCase extends BaseUseCase<
  { filingId: string; reportId: string; jobId: string },
  GetTaxEricJobOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly ericJobRepo: TaxEricJobRepoPort
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: { filingId: string; reportId: string; jobId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetTaxEricJobOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const filing = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!filing) {
      return err(new NotFoundError("Filing not found", { filingId: input.filingId }));
    }

    const report =
      input.reportId === input.filingId
        ? filing
        : await this.reportRepo.findById(workspaceId, input.reportId);
    if (!report) {
      return err(new NotFoundError("Report not found", { reportId: input.reportId }));
    }

    const job = await this.ericJobRepo.findById({
      tenantId: workspaceId,
      jobId: input.jobId,
    });
    if (!job || job.reportId !== report.id || job.filingId !== input.filingId) {
      return err(new NotFoundError("ERiC job not found", { jobId: input.jobId }));
    }

    return ok({
      job: toTaxEricJobDto(job),
    });
  }
}
