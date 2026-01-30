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
import { PrismaService } from "@corely/data";

@RequireTenant()
@Injectable()
export class RecalculateTaxFilingUseCase extends BaseUseCase<string, RecalculateTaxFilingResponse> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly detailUseCase: GetTaxFilingDetailUseCase,
    private readonly prisma: PrismaService
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

    // 1. Snapshot Backfill for Expenses in the period
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

    // 2. Snapshot Backfill for Invoices in the period (if needed for income-annual)
    if (report.type === "INCOME_TAX" || report.type === "VAT_ANNUAL") {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId: workspaceId,
          issuedAt: { gte: report.periodStart, lte: report.periodEnd },
          status: { in: ["ISSUED", "SENT", "PAID"] as any },
        },
        include: { lines: true },
      });

      for (const invoice of invoices) {
        // Simple total calculation for now
        const totalCents = invoice.lines.reduce(
          (sum, line) => sum + line.unitPriceCents * line.qty,
          0
        );
        const taxSnapshotMeta = invoice.taxSnapshot as any;
        const taxCents = taxSnapshotMeta?.totalTaxAmountCents ?? 0;
        const subtotalCents = totalCents - taxCents;

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
            breakdownJson: JSON.stringify(invoice.taxSnapshot ?? {}),
            version: 1,
          },
        });
      }
    }

    // 3. Update report meta
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
