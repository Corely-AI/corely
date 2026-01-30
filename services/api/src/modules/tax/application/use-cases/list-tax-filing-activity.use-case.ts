import { Injectable } from "@nestjs/common";
import { type TaxFilingActivityResponse, type TaxFilingActivityEvent } from "@corely/contracts";
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

@RequireTenant()
@Injectable()
export class ListTaxFilingActivityUseCase extends BaseUseCase<string, TaxFilingActivityResponse> {
  constructor(private readonly reportRepo: TaxReportRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    filingId: string,
    ctx: UseCaseContext
  ): Promise<Result<TaxFilingActivityResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    const events: TaxFilingActivityEvent[] = [
      {
        id: `${report.id}-created`,
        type: "created",
        timestamp: report.createdAt.toISOString(),
      },
    ];

    if (typeof report.meta?.lastRecalculatedAt === "string") {
      events.push({
        id: `${report.id}-recalculated`,
        type: "recalculated",
        timestamp: report.meta.lastRecalculatedAt,
      });
    }

    if (report.submittedAt) {
      events.push({
        id: `${report.id}-submitted`,
        type: "submitted",
        timestamp: report.submittedAt.toISOString(),
        submissionId: report.submissionReference ?? undefined,
        method:
          typeof report.meta?.submission === "object" && report.meta?.submission
            ? String((report.meta.submission as { method?: string }).method ?? "manual")
            : "manual",
      });
    }

    if (report.status === "PAID" && report.meta?.payment) {
      const amount = (report.meta.payment as { amountCents?: number }).amountCents;
      events.push({
        id: `${report.id}-paid`,
        type: "paid",
        timestamp: String(
          (report.meta.payment as { paidAt?: string }).paidAt ?? report.updatedAt.toISOString()
        ),
        amountCents: typeof amount === "number" ? amount : undefined,
        method: String((report.meta.payment as { method?: string }).method ?? "manual"),
      });
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return ok({ events });
  }
}
