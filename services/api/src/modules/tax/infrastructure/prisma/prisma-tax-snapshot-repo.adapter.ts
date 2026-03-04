import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { TaxSourceType } from "@corely/contracts";
import { TaxSnapshotRepoPort } from "../../domain/ports";
import type { TaxSnapshotEntity } from "../../domain/entities";
import type {
  TaxInvoiceDateMode,
  TaxSnapshotPeriodOptions,
} from "../../domain/ports/tax-snapshot-repo.port";

@Injectable()
export class PrismaTaxSnapshotRepoAdapter extends TaxSnapshotRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private readonly snapshotSelect = {
    id: true,
    tenantId: true,
    sourceType: true,
    sourceId: true,
    jurisdiction: true,
    regime: true,
    roundingMode: true,
    currency: true,
    calculatedAt: true,
    subtotalAmountCents: true,
    taxTotalAmountCents: true,
    totalAmountCents: true,
    breakdownJson: true,
    version: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  /**
   * Lock snapshot - idempotent by (tenantId, sourceType, sourceId)
   */
  async lockSnapshot(
    snapshot: Omit<TaxSnapshotEntity, "id" | "version" | "createdAt" | "updatedAt">
  ): Promise<TaxSnapshotEntity> {
    // Use upsert to ensure idempotency
    const created = await this.prisma.taxSnapshot.upsert({
      where: {
        tenantId_sourceType_sourceId: {
          tenantId: snapshot.tenantId,
          sourceType: snapshot.sourceType,
          sourceId: snapshot.sourceId,
        },
      },
      update: {}, // Don't update if exists (immutable)
      create: {
        tenantId: snapshot.tenantId,
        sourceType: snapshot.sourceType,
        sourceId: snapshot.sourceId,
        jurisdiction: snapshot.jurisdiction,
        regime: snapshot.regime,
        roundingMode: snapshot.roundingMode,
        currency: snapshot.currency,
        calculatedAt: snapshot.calculatedAt,
        subtotalAmountCents: snapshot.subtotalAmountCents,
        taxTotalAmountCents: snapshot.taxTotalAmountCents,
        totalAmountCents: snapshot.totalAmountCents,
        breakdownJson: snapshot.breakdownJson,
      },
      select: this.snapshotSelect,
    });

    return this.toDomain(created);
  }

  async findBySource(
    tenantId: string,
    sourceType: TaxSourceType,
    sourceId: string
  ): Promise<TaxSnapshotEntity | null> {
    const snapshot = await this.prisma.taxSnapshot.findUnique({
      where: {
        tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
      },
      select: this.snapshotSelect,
    });

    return snapshot ? this.toDomain(snapshot) : null;
  }

  async findByPeriod(
    tenantId: string,
    start: Date,
    end: Date,
    sourceType?: TaxSourceType,
    options?: TaxSnapshotPeriodOptions
  ): Promise<TaxSnapshotEntity[]> {
    const invoiceDateMode: TaxInvoiceDateMode = options?.invoiceDateMode ?? "document";
    const snapshots = await this.prisma.taxSnapshot.findMany({
      where: {
        tenantId,
        calculatedAt: { gte: start, lte: end },
        ...(sourceType ? { sourceType } : {}),
      },
      orderBy: { calculatedAt: "asc" },
      select: this.snapshotSelect,
    });

    const invoiceIds = snapshots
      .filter((snapshot) => snapshot.sourceType === "INVOICE")
      .map((snapshot) => snapshot.sourceId);
    const expenseIds = snapshots
      .filter((snapshot) => snapshot.sourceType === "EXPENSE")
      .map((snapshot) => snapshot.sourceId);

    const [invoices, expenses] = await Promise.all([
      invoiceIds.length > 0
        ? this.prisma.invoice.findMany({
            where: { tenantId, id: { in: invoiceIds } },
            select: {
              id: true,
              status: true,
              billToName: true,
              taxSnapshot: true,
              payments: {
                select: {
                  paidAt: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      expenseIds.length > 0
        ? this.prisma.expense.findMany({
            where: { tenantId, id: { in: expenseIds } },
            select: { id: true, merchantName: true, category: true },
          })
        : Promise.resolve([]),
    ]);

    const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    const expenseById = new Map(expenses.map((expense) => [expense.id, expense]));

    const mappedSnapshots: TaxSnapshotEntity[] = [];
    for (const snapshot of snapshots) {
      const base = this.toDomain(snapshot);
      if (snapshot.sourceType === "INVOICE") {
        const invoice = invoiceById.get(snapshot.sourceId);
        if (invoiceDateMode === "payment" && !invoice) {
          mappedSnapshots.push({
            ...base,
            vatTreatment: base.vatTreatment ?? "unknown",
          });
          continue;
        }
        const paymentDate =
          invoiceDateMode === "payment"
            ? this.resolveIncomeInvoicePaymentDate(invoice, start, end)
            : null;
        if (invoiceDateMode === "payment" && !paymentDate) {
          continue;
        }
        const vatTreatment = this.resolveInvoiceVatTreatment(invoice?.taxSnapshot);
        mappedSnapshots.push({
          ...base,
          calculatedAt: paymentDate ?? base.calculatedAt,
          counterparty: invoice?.billToName ?? undefined,
          vatTreatment,
          missingCategory: false,
          missingTaxTreatment: vatTreatment === "unknown",
        });
        continue;
      }

      const expense = expenseById.get(snapshot.sourceId);
      const vatTreatment = snapshot.taxTotalAmountCents > 0 ? "standard" : "unknown";
      const category = expense?.category ?? undefined;
      mappedSnapshots.push({
        ...base,
        counterparty: expense?.merchantName ?? undefined,
        category,
        vatTreatment,
        missingCategory: !category,
        missingTaxTreatment: vatTreatment === "unknown",
      });
    }

    const includeInvoiceFallback = !sourceType || sourceType === "INVOICE";
    if (!includeInvoiceFallback) {
      return mappedSnapshots;
    }

    const missingInvoiceSnapshots = await this.findInlineInvoiceSnapshotFallback(
      tenantId,
      start,
      end,
      new Set(invoiceIds),
      invoiceDateMode
    );

    if (missingInvoiceSnapshots.length === 0) {
      return mappedSnapshots;
    }

    return [...mappedSnapshots, ...missingInvoiceSnapshots].sort(
      (left, right) => left.calculatedAt.getTime() - right.calculatedAt.getTime()
    );
  }

  private async findInlineInvoiceSnapshotFallback(
    tenantId: string,
    start: Date,
    end: Date,
    existingInvoiceIds: Set<string>,
    invoiceDateMode: TaxInvoiceDateMode
  ): Promise<TaxSnapshotEntity[]> {
    const invoiceSelect = {
      id: true,
      tenantId: true,
      status: true,
      billToName: true,
      currency: true,
      issuedAt: true,
      invoiceDate: true,
      createdAt: true,
      updatedAt: true,
      taxSnapshot: true,
      payments: {
        select: {
          paidAt: true,
        },
      },
    } as const;

    const invoices =
      invoiceDateMode === "payment"
        ? await this.prisma.invoice.findMany({
            where: {
              tenantId,
              status: "PAID",
              payments: {
                some: {
                  paidAt: {
                    gte: start,
                    lte: end,
                  },
                },
              },
            },
            select: invoiceSelect,
          })
        : await this.prisma.invoice.findMany({
            where: {
              tenantId,
              status: { in: ["ISSUED", "SENT", "PAID"] },
              OR: [
                {
                  invoiceDate: {
                    gte: start,
                    lte: end,
                  },
                },
                {
                  invoiceDate: null,
                  issuedAt: {
                    gte: start,
                    lte: end,
                  },
                },
                {
                  issuedAt: null,
                  invoiceDate: null,
                  createdAt: {
                    gte: start,
                    lte: end,
                  },
                },
              ],
            },
            select: invoiceSelect,
          });

    return invoices
      .filter((invoice) => !existingInvoiceIds.has(invoice.id))
      .map((invoice) => {
        const paymentDate =
          invoiceDateMode === "payment"
            ? this.resolveIncomeInvoicePaymentDate(invoice, start, end)
            : null;
        if (invoiceDateMode === "payment" && !paymentDate) {
          return null;
        }
        return this.mapInlineInvoiceToSnapshotEntity(invoice, paymentDate ?? undefined);
      })
      .filter((snapshot): snapshot is TaxSnapshotEntity => Boolean(snapshot));
  }

  private mapInlineInvoiceToSnapshotEntity(
    invoice: {
      id: string;
      tenantId: string;
      status: string;
      billToName: string | null;
      currency: string;
      issuedAt: Date | null;
      invoiceDate: Date | null;
      createdAt: Date;
      updatedAt: Date;
      taxSnapshot: unknown;
      payments: Array<{ paidAt: Date }>;
    },
    calculatedAtOverride?: Date
  ): TaxSnapshotEntity | null {
    if (!invoice.taxSnapshot || typeof invoice.taxSnapshot !== "object") {
      return null;
    }

    const snapshot = invoice.taxSnapshot as Record<string, unknown>;
    const subtotal = this.readNumber(snapshot, "subtotalAmountCents") ?? 0;
    const tax =
      this.readNumber(snapshot, "taxTotalAmountCents") ??
      this.readNumber(snapshot, "totalTaxAmountCents") ??
      0;
    const total = this.readNumber(snapshot, "totalAmountCents") ?? subtotal + tax;

    const calculatedAt =
      calculatedAtOverride ?? invoice.invoiceDate ?? invoice.issuedAt ?? invoice.createdAt;
    const vatTreatment = this.resolveInvoiceVatTreatment(invoice.taxSnapshot);

    return {
      id: `inline-${invoice.id}`,
      tenantId: invoice.tenantId,
      sourceType: "INVOICE",
      sourceId: invoice.id,
      jurisdiction: "DE",
      regime: "STANDARD_VAT",
      roundingMode: "PER_DOCUMENT",
      currency: invoice.currency,
      calculatedAt,
      subtotalAmountCents: subtotal,
      taxTotalAmountCents: tax,
      totalAmountCents: total,
      breakdownJson: JSON.stringify(invoice.taxSnapshot),
      counterparty: invoice.billToName ?? undefined,
      vatTreatment,
      missingCategory: false,
      missingTaxTreatment: vatTreatment === "unknown",
      version: 1,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private resolveIncomeInvoicePaymentDate(
    invoice:
      | {
          status: string;
          payments: Array<{ paidAt: Date }>;
        }
      | undefined,
    start: Date,
    end: Date
  ): Date | null {
    if (!invoice || invoice.status !== "PAID" || invoice.payments.length === 0) {
      return null;
    }
    const finalPaidAt = invoice.payments.reduce(
      (latest, payment) => (payment.paidAt > latest ? payment.paidAt : latest),
      invoice.payments[0].paidAt
    );
    if (finalPaidAt < start || finalPaidAt > end) {
      return null;
    }
    return finalPaidAt;
  }

  private readNumber(snapshot: Record<string, unknown>, key: string): number | null {
    const value = snapshot[key];
    return typeof value === "number" ? value : null;
  }

  private resolveInvoiceVatTreatment(snapshot: unknown): string {
    if (!snapshot || typeof snapshot !== "object") {
      return "unknown";
    }
    const raw = snapshot as { totalsByKind?: unknown; totalTaxAmountCents?: unknown };
    if (typeof raw.totalTaxAmountCents === "number" && raw.totalTaxAmountCents > 0) {
      return "standard";
    }
    if (
      raw.totalsByKind &&
      typeof raw.totalsByKind === "object" &&
      Object.keys(raw.totalsByKind as Record<string, unknown>).length > 0
    ) {
      return "standard";
    }
    return "unknown";
  }

  private toDomain(model: any): TaxSnapshotEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      sourceType: model.sourceType,
      sourceId: model.sourceId,
      jurisdiction: model.jurisdiction,
      regime: model.regime,
      roundingMode: model.roundingMode,
      currency: model.currency,
      calculatedAt: model.calculatedAt,
      subtotalAmountCents: model.subtotalAmountCents,
      taxTotalAmountCents: model.taxTotalAmountCents,
      totalAmountCents: model.totalAmountCents,
      breakdownJson: model.breakdownJson,
      counterparty: model.counterparty ?? undefined,
      category: model.category ?? undefined,
      vatTreatment: model.vatTreatment ?? undefined,
      missingCategory:
        typeof model.missingCategory === "boolean" ? model.missingCategory : undefined,
      missingTaxTreatment:
        typeof model.missingTaxTreatment === "boolean" ? model.missingTaxTreatment : undefined,
      version: model.version,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
