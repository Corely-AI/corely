import { Inject, Injectable } from "@nestjs/common";
import type { CreateTaxEricJobOutput, TaxEricJobAction } from "@corely/contracts";
import {
  BaseUseCase,
  OUTBOX_PORT,
  type OutboxPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { triggerWorkerTick } from "@/shared/infrastructure/worker/trigger-worker-tick";
import {
  TaxEricJobRepoPort,
  TaxReportRepoPort,
  TaxReportSectionRepoPort,
} from "../../domain/ports";
import {
  ERIC_PAYLOAD_MAPPER_PORT,
  type EricPayloadMapperPort,
} from "../ports/eric-payload-mapper.port";
import {
  ANNUAL_INCOME_REPORT_TYPE,
  ANNUAL_INCOME_SECTION_KEY,
  buildDefaultAnnualIncomePayload,
  readAnnualIncomePayloadFromLegacyMeta,
  readAnnualIncomePayloadFromSection,
} from "../services/annual-income-report.service";
import { ensureIncomeTaxReportForFiling, toTaxEricJobDto } from "./tax-reporting.helpers";

@RequireTenant()
@Injectable()
export class RequestTaxEricJobUseCase extends BaseUseCase<
  {
    filingId: string;
    reportId: string;
    action: TaxEricJobAction;
  },
  CreateTaxEricJobOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly sectionRepo: TaxReportSectionRepoPort,
    private readonly ericJobRepo: TaxEricJobRepoPort,
    @Inject(ERIC_PAYLOAD_MAPPER_PORT) private readonly payloadMapper: EricPayloadMapperPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: { filingId: string; reportId: string; action: TaxEricJobAction },
    ctx: UseCaseContext
  ): Promise<Result<CreateTaxEricJobOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await ensureIncomeTaxReportForFiling({
      reportRepo: this.reportRepo,
      workspaceId,
      filingId: input.filingId,
      reportId: input.reportId,
    });

    const section = await this.sectionRepo.findByReportAndSection({
      tenantId: workspaceId,
      reportId: report.id,
      sectionKey: ANNUAL_INCOME_SECTION_KEY,
    });

    const annualIncome = section
      ? readAnnualIncomePayloadFromSection(section).payload
      : (readAnnualIncomePayloadFromLegacyMeta(report.meta).payload ??
        buildDefaultAnnualIncomePayload());

    const ericRequest = this.payloadMapper.mapReportToEricPayload({
      filingId: input.filingId,
      reportId: report.id,
      reportType: ANNUAL_INCOME_REPORT_TYPE,
      taxYear: report.periodStart.getUTCFullYear(),
      annualIncome,
    });

    const job = await this.ericJobRepo.create({
      tenantId: workspaceId,
      filingId: input.filingId,
      reportId: report.id,
      reportType: ANNUAL_INCOME_REPORT_TYPE,
      action: input.action,
      requestPayload: { ...ericRequest },
    });

    await this.outbox.enqueue({
      tenantId: workspaceId,
      eventType: "tax.report.eric.job.requested",
      payload: {
        tenantId: ctx.tenantId ?? workspaceId,
        workspaceId,
        filingId: input.filingId,
        reportId: report.id,
        jobId: job.id,
      },
      correlationId: ctx.correlationId,
    });

    void triggerWorkerTick({
      reason: "tax.report.eric.job.requested",
      correlationId: ctx.correlationId,
      tenantId: ctx.tenantId ?? workspaceId,
      workspaceId,
      runnerNames: ["outbox"],
    });

    return ok({
      job: toTaxEricJobDto(job),
    });
  }
}
