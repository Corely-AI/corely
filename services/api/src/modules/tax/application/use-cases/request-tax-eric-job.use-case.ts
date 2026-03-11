import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { CreateTaxEricJobOutput, TaxEricJobAction } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ConflictError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { triggerWorkerTick } from "@/shared/infrastructure/worker/trigger-worker-tick";
import { TaxProfileRepoPort, TaxReportRepoPort, TaxEricJobRepoPort } from "../../domain/ports";
import {
  TAX_ELSTER_GATEWAY_PORT,
  type TaxElsterGatewayPort,
} from "../ports/tax-elster-gateway.port";
import {
  TAX_ELSTER_SUBMISSION_BUILDER_PORT,
  type TaxElsterSubmissionBuilderPort,
} from "../ports/tax-elster-submission-builder.port";
import { ensureUstvaReportForFiling, toTaxEricJobDto } from "./tax-reporting.helpers";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";
import { resolveTaxFilingExportEligibility } from "../services/tax-filing-export-eligibility";

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
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly ericJobRepo: TaxEricJobRepoPort,
    private readonly filingDetailUseCase: GetTaxFilingDetailUseCase,
    @Inject(TAX_ELSTER_SUBMISSION_BUILDER_PORT)
    private readonly submissionBuilder: TaxElsterSubmissionBuilderPort,
    @Inject(TAX_ELSTER_GATEWAY_PORT) private readonly gateway: TaxElsterGatewayPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: { filingId: string; reportId: string; action: TaxEricJobAction },
    ctx: UseCaseContext
  ): Promise<Result<CreateTaxEricJobOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const idempotencyKey = this.resolveRequestIdempotencyKey(ctx);

    if (this.gateway.getConnectionStatus() !== "connected") {
      return err(
        new ValidationError(
          "ELSTER gateway is not configured for this environment.",
          undefined,
          "Tax:ElsterNotConfigured"
        )
      );
    }

    const report = await ensureUstvaReportForFiling({
      reportRepo: this.reportRepo,
      workspaceId,
      filingId: input.filingId,
      reportId: input.reportId,
    });

    const detailResult = await this.filingDetailUseCase.execute(input.filingId, ctx);
    if ("error" in detailResult) {
      return detailResult;
    }

    const filing = detailResult.value.filing;
    const profile = await this.taxProfileRepo.getActive(workspaceId, report.periodEnd);
    const eligibility = resolveTaxFilingExportEligibility({
      filingType: filing.type,
      jurisdiction: profile?.country ?? "",
      lastRecalculatedAt: filing.totals?.lastRecalculatedAt,
    });

    if (!eligibility.exports.canExportElsterXml) {
      return err(
        new ConflictError(
          "This filing is not ready for ELSTER UStVA processing. Recalculate first.",
          undefined,
          "Tax:FilingNotReadyForExport"
        )
      );
    }

    if (idempotencyKey) {
      const existing = await this.ericJobRepo.findLatestByIdempotencyKey({
        tenantId: workspaceId,
        reportId: report.id,
        action: input.action,
        idempotencyKey,
      });

      if (existing) {
        return ok({
          job: toTaxEricJobDto(existing),
        });
      }
    }

    const requestId = randomUUID();
    const gatewayRequest = this.submissionBuilder.build({
      requestId,
      filing,
      report,
      reportType: "vat_advance_report",
      operation: input.action,
      tenantId: ctx.tenantId ?? workspaceId,
      workspaceId,
      correlationId: ctx.correlationId ?? requestId,
      actorUserId: ctx.userId,
      idempotencyKey,
    });

    const requestHash = createHash("sha256").update(JSON.stringify(gatewayRequest)).digest("hex");

    const job = await this.ericJobRepo.create({
      jobId: requestId,
      tenantId: workspaceId,
      filingId: input.filingId,
      reportId: report.id,
      reportType: "vat_advance_report",
      declarationType: gatewayRequest.declarationType,
      action: input.action,
      requestPayload: gatewayRequest as unknown as Record<string, unknown>,
      correlationId: gatewayRequest.correlationId,
      idempotencyKey,
      payloadVersion: gatewayRequest.payloadVersion,
      requestHash,
      certificateReferenceId: gatewayRequest.certificateReferenceId ?? null,
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
      correlationId: gatewayRequest.correlationId,
    });

    await this.audit.log({
      tenantId: workspaceId,
      action: "tax_elster_job.requested",
      entityType: "TAX_ERIC_JOB",
      entityId: job.id,
      userId: ctx.userId ?? "system",
      metadata: {
        filingId: input.filingId,
        reportId: report.id,
        action: input.action,
        declarationType: gatewayRequest.declarationType,
        payloadVersion: gatewayRequest.payloadVersion,
        correlationId: gatewayRequest.correlationId,
      },
    });

    void triggerWorkerTick({
      reason: "tax.report.eric.job.requested",
      correlationId: gatewayRequest.correlationId,
      tenantId: ctx.tenantId ?? workspaceId,
      workspaceId,
      runnerNames: ["outbox"],
    });

    return ok({
      job: toTaxEricJobDto(job),
    });
  }

  private resolveRequestIdempotencyKey(ctx: UseCaseContext): string | undefined {
    const candidate = ctx as UseCaseContext & {
      idempotencyKey?: unknown;
    };

    return typeof candidate.idempotencyKey === "string" ? candidate.idempotencyKey : undefined;
  }
}
