import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { TaxSourceType } from "@corely/contracts";
import { TaxSnapshotRepoPort } from "../../domain/ports";
import type { TaxSnapshotEntity } from "../../domain/entities";

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
    sourceType?: TaxSourceType
  ): Promise<TaxSnapshotEntity[]> {
    const snapshots = await this.prisma.taxSnapshot.findMany({
      where: {
        tenantId,
        calculatedAt: { gte: start, lte: end },
        ...(sourceType ? { sourceType } : {}),
      },
      orderBy: { calculatedAt: "asc" },
      select: this.snapshotSelect,
    });

    if (snapshots.length === 0) {
      return [];
    }

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
            select: { id: true, billToName: true, taxSnapshot: true },
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

    return snapshots.map((snapshot) => {
      const base = this.toDomain(snapshot);
      if (snapshot.sourceType === "INVOICE") {
        const invoice = invoiceById.get(snapshot.sourceId);
        const vatTreatment = this.resolveInvoiceVatTreatment(invoice?.taxSnapshot);
        return {
          ...base,
          counterparty: invoice?.billToName ?? undefined,
          vatTreatment,
          missingCategory: false,
          missingTaxTreatment: vatTreatment === "unknown",
        };
      }

      const expense = expenseById.get(snapshot.sourceId);
      const vatTreatment = snapshot.taxTotalAmountCents > 0 ? "standard" : "unknown";
      const category = expense?.category ?? undefined;
      return {
        ...base,
        counterparty: expense?.merchantName ?? undefined,
        category,
        vatTreatment,
        missingCategory: !category,
        missingTaxTreatment: vatTreatment === "unknown",
      };
    });
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
