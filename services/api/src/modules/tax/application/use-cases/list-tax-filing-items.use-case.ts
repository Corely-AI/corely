import { Injectable } from "@nestjs/common";
import type {
  TaxFilingItemsListQuery,
  TaxFilingItemsListResponse,
  TaxFilingItemRow,
  TaxFilingItemSourceType,
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
import { TaxReportRepoPort, TaxSnapshotRepoPort } from "../../domain/ports";

export type ListTaxFilingItemsInput = {
  filingId: string;
  query: TaxFilingItemsListQuery;
};

@RequireTenant()
@Injectable()
export class ListTaxFilingItemsUseCase extends BaseUseCase<
  ListTaxFilingItemsInput,
  TaxFilingItemsListResponse
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly snapshotRepo: TaxSnapshotRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ListTaxFilingItemsInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxFilingItemsListResponse, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const report = await this.reportRepo.findById(workspaceId, input.filingId);
    if (!report) {
      return err(new NotFoundError("Filing not found"));
    }

    const page = input.query.page ?? 1;
    const pageSize = input.query.pageSize ?? 20;

    if (input.query.sourceType === "tx" || input.query.sourceType === "transaction") {
      return ok({
        items: [],
        pageInfo: { page, pageSize, total: 0, hasNextPage: false },
      });
    }

    const sourceType = this.mapToSnapshotSourceType(input.query.sourceType);
    const invoiceDateMode = report.type === "INCOME_TAX" ? "payment" : "document";
    const snapshots = await this.snapshotRepo.findByPeriod(
      workspaceId,
      report.periodStart,
      report.periodEnd,
      sourceType,
      sourceType === "EXPENSE" ? undefined : { invoiceDateMode }
    );

    let rows = snapshots.map((snap) => this.mapSnapshotToRow(snap));

    if (input.query.q) {
      const q = input.query.q.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.sourceId.toLowerCase().includes(q) ||
          (row.vatTreatment ? row.vatTreatment.toLowerCase().includes(q) : false) ||
          (row.category ? row.category.toLowerCase().includes(q) : false) ||
          (row.counterparty ? row.counterparty.toLowerCase().includes(q) : false)
      );
    }

    if (input.query.dateFrom || input.query.dateTo) {
      const from = input.query.dateFrom ? new Date(input.query.dateFrom) : undefined;
      const to = input.query.dateTo ? new Date(input.query.dateTo) : undefined;
      rows = rows.filter((row) => {
        const date = new Date(row.date);
        if (from && date < from) {
          return false;
        }
        if (to && date > to) {
          return false;
        }
        return true;
      });
    }

    if (input.query.category) {
      const category = input.query.category.toLowerCase();
      rows = rows.filter((row) =>
        row.category ? row.category.toLowerCase().includes(category) : false
      );
    }

    if (input.query.vatTreatment) {
      const vatTreatment = input.query.vatTreatment.toLowerCase();
      rows = rows.filter((row) =>
        row.vatTreatment ? row.vatTreatment.toLowerCase() === vatTreatment : false
      );
    }

    if (typeof input.query.needsAttention === "boolean") {
      rows = rows.filter((row) => row.flags.needsAttention === input.query.needsAttention);
    }

    if (typeof input.query.missingMapping === "boolean") {
      rows = rows.filter((row) => row.flags.missingTaxTreatment === input.query.missingMapping);
    }

    rows = this.sortRows(rows, input.query.sort);

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    return ok({
      items: paged,
      pageInfo: {
        page,
        pageSize,
        total,
        hasNextPage: start + pageSize < total,
      },
    });
  }

  private mapToSnapshotSourceType(
    sourceType?: TaxFilingItemSourceType
  ): "INVOICE" | "EXPENSE" | undefined {
    if (!sourceType) {
      return undefined;
    }
    if (sourceType === "invoice" || sourceType === "income") {
      return "INVOICE";
    }
    if (sourceType === "expense") {
      return "EXPENSE";
    }
    return undefined;
  }

  private mapSnapshotToRow(snapshot: {
    id: string;
    sourceType: string;
    sourceId: string;
    calculatedAt: Date;
    subtotalAmountCents: number;
    taxTotalAmountCents: number;
    totalAmountCents: number;
    counterparty?: string;
    category?: string;
    vatTreatment?: string;
    missingCategory?: boolean;
    missingTaxTreatment?: boolean;
  }): TaxFilingItemRow {
    const sourceType: TaxFilingItemSourceType =
      snapshot.sourceType === "INVOICE" ? "invoice" : "expense";
    const deepLink =
      sourceType === "invoice"
        ? `/invoices/${snapshot.sourceId}`
        : `/expenses/${snapshot.sourceId}`;
    const missingCategory = Boolean(snapshot.missingCategory);
    const missingTaxTreatment = Boolean(snapshot.missingTaxTreatment);
    const flags = {
      needsAttention: missingCategory || missingTaxTreatment,
      missingCategory,
      missingTaxTreatment,
    };
    return {
      id: snapshot.id,
      sourceType,
      sourceId: snapshot.sourceId,
      date: snapshot.calculatedAt.toISOString(),
      counterparty: snapshot.counterparty,
      category: snapshot.category,
      vatTreatment: snapshot.vatTreatment ?? "unknown",
      netCents: snapshot.subtotalAmountCents,
      taxCents: snapshot.taxTotalAmountCents,
      grossCents: snapshot.totalAmountCents,
      net: snapshot.subtotalAmountCents,
      vat: snapshot.taxTotalAmountCents,
      gross: snapshot.totalAmountCents,
      flags,
      missingCategory,
      missingTaxTreatment,
      deepLink,
    };
  }

  private sortRows(rows: TaxFilingItemRow[], sort?: string | string[]): TaxFilingItemRow[] {
    if (!sort) {
      return rows;
    }
    const sortKey = Array.isArray(sort) ? sort[0] : sort;
    const [field, direction] = sortKey.split(":");
    const dir = direction === "desc" ? -1 : 1;

    return [...rows].sort((a, b) => {
      if (field === "date") {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
      }
      if (field === "grossCents") {
        return ((a.grossCents ?? 0) - (b.grossCents ?? 0)) * dir;
      }
      if (field === "netCents") {
        return ((a.netCents ?? 0) - (b.netCents ?? 0)) * dir;
      }
      return 0;
    });
  }
}
