import { Injectable, Inject } from "@nestjs/common";
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
  OUTBOX_PORT,
  type OutboxPort,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { GetTaxFilingDetailUseCase } from "./get-tax-filing-detail.use-case";
import { PrismaService } from "@corely/data";
import type { TaxFilingActivityEvent } from "@corely/contracts";

/**
 * RecalculateTaxFilingUseCase
 *
 * Backfills tax snapshots for all source documents in the filing period,
 * emits a TaxFilingRecalculated domain event, and refreshes the detail view.
 *
 * Note: Direct PrismaService usage here is a known violation of module-boundary rules.
 * Task: move these to dedicated repo port methods in a follow-up PR.
 */
@RequireTenant()
@Injectable()
export class RecalculateTaxFilingUseCase extends BaseUseCase<string, RecalculateTaxFilingResponse> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly detailUseCase: GetTaxFilingDetailUseCase,
    private readonly prisma: PrismaService,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
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
      return err(new NotFoundError("Filing not found", { code: "Tax:FilingNotFound" }));
    }

    // 1. Backfill snapshots for Expenses in the period
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId: workspaceId,
        expenseDate: { gte: report.periodStart, lte: report.periodEnd },
        status: "APPROVED",
      },
    });

    for (const expense of expenses) {
      const tax = expense.taxAmountCents ?? 0;
      const subtotal = expense.totalAmountCents - tax;

      await this.prisma.taxSnapshot.upsert({
        where: {
          tenantId_sourceType_sourceId: {
            tenantId: workspaceId,
            sourceType: "EXPENSE",
            sourceId: expense.id,
          },
        },
        update: {
          subtotalAmountCents: subtotal,
          taxTotalAmountCents: tax,
          totalAmountCents: expense.totalAmountCents,
          currency: expense.currency,
          calculatedAt: expense.expenseDate,
          // packId not set here — expenses don't run through the jurisdiction pack
        },
        create: {
          tenantId: workspaceId,
          sourceType: "EXPENSE",
          sourceId: expense.id,
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: expense.currency,
          calculatedAt: expense.expenseDate,
          subtotalAmountCents: subtotal,
          taxTotalAmountCents: tax,
          totalAmountCents: expense.totalAmountCents,
          breakdownJson: "{}",
          version: 1,
        },
      });
    }

    // 2. Backfill snapshots for Invoices (for income-annual / VAT annual)
    if (report.type === "INCOME_TAX" || report.type === "VAT_ANNUAL") {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId: workspaceId,
          issuedAt: { gte: report.periodStart, lte: report.periodEnd },
          status: { in: ["ISSUED", "SENT", "PAID"] as any[] },
        },
        include: { lines: true },
      });

      for (const invoice of invoices) {
        const { subtotalCents, taxCents, totalCents } = this.resolveInvoiceAmounts(invoice);
        const invoiceBreakdown = invoice.taxSnapshot ? JSON.stringify(invoice.taxSnapshot) : "{}";

        await this.prisma.taxSnapshot.upsert({
          where: {
            tenantId_sourceType_sourceId: {
              tenantId: workspaceId,
              sourceType: "INVOICE",
              sourceId: invoice.id,
            },
          },
          update: {
            subtotalAmountCents: subtotalCents,
            taxTotalAmountCents: taxCents,
            totalAmountCents: totalCents,
            currency: invoice.currency,
            calculatedAt: invoice.issuedAt ?? invoice.createdAt,
          },
          create: {
            tenantId: workspaceId,
            sourceType: "INVOICE",
            sourceId: invoice.id,
            jurisdiction: "DE",
            regime: "STANDARD_VAT",
            roundingMode: "PER_DOCUMENT",
            currency: invoice.currency,
            calculatedAt: invoice.issuedAt ?? invoice.createdAt,
            subtotalAmountCents: subtotalCents,
            taxTotalAmountCents: taxCents,
            totalAmountCents: totalCents,
            breakdownJson: invoiceBreakdown,
            version: 1,
          },
        });
      }
    }

    // 3. Update report meta with recalculation timestamp
    const recalculatedAt = new Date().toISOString();
    const meta = {
      ...(report.meta ?? {}),
      lastRecalculatedAt: recalculatedAt,
      activity: this.appendActivity(report.meta, {
        id: `${filingId}-recalculated-${Date.now()}`,
        type: "recalculated",
        timestamp: recalculatedAt,
        actor: ctx.userId ? { id: ctx.userId } : undefined,
        payload: {
          lastRecalculatedAt: recalculatedAt,
        },
      }),
    };
    await this.reportRepo.updateMeta({ tenantId: workspaceId, reportId: filingId, meta });

    // 4. Emit domain event
    await this.outbox.enqueue({
      eventType: "TaxFilingRecalculated",
      payload: {
        filingId,
        tenantId: workspaceId,
        recalculatedAt: meta.lastRecalculatedAt,
      },
      tenantId: workspaceId,
    });

    const refreshed = await this.detailUseCase.execute(filingId, ctx);
    if ("error" in refreshed) {
      return refreshed;
    }
    return ok({ filing: refreshed.value.filing });
  }

  private resolveInvoiceAmounts(invoice: {
    lines: Array<{ unitPriceCents: number; qty: number }>;
    taxSnapshot: unknown;
  }): {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
  } {
    const lineNetCents = invoice.lines.reduce(
      (sum, line) => sum + line.unitPriceCents * line.qty,
      0
    );

    const snapshot =
      invoice.taxSnapshot && typeof invoice.taxSnapshot === "object"
        ? (invoice.taxSnapshot as Record<string, unknown>)
        : null;

    const snapshotSubtotal = this.readNumber(snapshot, "subtotalAmountCents");
    const snapshotTax =
      this.readNumber(snapshot, "taxTotalAmountCents") ??
      this.readNumber(snapshot, "totalTaxAmountCents");
    const snapshotTotal = this.readNumber(snapshot, "totalAmountCents");

    const subtotalCents = snapshotSubtotal ?? lineNetCents;
    const taxCents = snapshotTax ?? 0;
    const totalCents = snapshotTotal ?? subtotalCents + taxCents;

    return {
      subtotalCents,
      taxCents,
      totalCents,
    };
  }

  private readNumber(snapshot: Record<string, unknown> | null, key: string): number | null {
    if (!snapshot) {
      return null;
    }
    const value = snapshot[key];
    return typeof value === "number" ? value : null;
  }

  private appendActivity(
    meta: Record<string, unknown> | null | undefined,
    event: TaxFilingActivityEvent
  ): TaxFilingActivityEvent[] {
    const current =
      meta && typeof meta === "object" && Array.isArray(meta.activity) ? meta.activity : [];
    const typed = current
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        return item as TaxFilingActivityEvent;
      })
      .filter((item): item is TaxFilingActivityEvent => Boolean(item));
    return [...typed, event];
  }
}
