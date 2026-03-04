import { Injectable } from "@nestjs/common";
import {
  TaxFilingActivityEventSchema,
  type TaxFilingActivityResponse,
  type TaxFilingActivityEvent,
} from "@corely/contracts";
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

    const derivedEvents: TaxFilingActivityEvent[] = [
      {
        id: `${report.id}-created`,
        type: "created",
        timestamp: report.createdAt.toISOString(),
        payload: {},
      },
    ];

    if (typeof report.meta?.lastRecalculatedAt === "string") {
      derivedEvents.push({
        id: `${report.id}-recalculated`,
        type: "recalculated",
        timestamp: report.meta.lastRecalculatedAt,
        payload: {
          lastRecalculatedAt: report.meta.lastRecalculatedAt,
        },
      });
    }

    if (report.submittedAt) {
      derivedEvents.push({
        id: `${report.id}-submitted`,
        type: "submitted",
        timestamp: report.submittedAt.toISOString(),
        payload: {
          submissionId: report.submissionReference ?? undefined,
          method:
            typeof report.meta?.submission === "object" && report.meta?.submission
              ? String((report.meta.submission as { method?: string }).method ?? "manual")
              : "manual",
        },
        notes: report.submissionNotes ?? undefined,
      });
    }

    if (report.status === "PAID" && report.meta?.payment) {
      const amount = (report.meta.payment as { amountCents?: number }).amountCents;
      derivedEvents.push({
        id: `${report.id}-paid`,
        type: "paid",
        timestamp: String(
          (report.meta.payment as { paidAt?: string }).paidAt ?? report.updatedAt.toISOString()
        ),
        payload: {
          amountCents: typeof amount === "number" ? amount : undefined,
          method: String((report.meta.payment as { method?: string }).method ?? "manual"),
        },
      });
    }

    const storedActivity =
      report.meta && typeof report.meta === "object" && Array.isArray(report.meta.activity)
        ? report.meta.activity
        : [];
    const storedEvents = storedActivity
      .map((item) => {
        const parsed = TaxFilingActivityEventSchema.safeParse(item);
        return parsed.success ? parsed.data : null;
      })
      .filter((item): item is TaxFilingActivityEvent => Boolean(item));

    const merged = [...storedEvents, ...derivedEvents];
    const dedupedByKey = new Map<string, TaxFilingActivityEvent>();
    for (const event of merged) {
      const key = `${event.type}:${event.timestamp}`;
      if (!dedupedByKey.has(key)) {
        dedupedByKey.set(key, event);
      }
    }

    const events = [...dedupedByKey.values()];
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return ok({ events });
  }
}
