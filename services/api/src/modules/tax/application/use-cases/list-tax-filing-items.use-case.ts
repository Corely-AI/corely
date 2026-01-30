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

    if (input.query.sourceType === "transaction") {
      return ok({
        items: [],
        pageInfo: { page, pageSize, total: 0, hasNextPage: false },
      });
    }

    const sourceType = this.mapToSnapshotSourceType(input.query.sourceType);
    const snapshots = await this.snapshotRepo.findByPeriod(
      workspaceId,
      report.periodStart,
      report.periodEnd,
      sourceType
    );

    let rows = snapshots.map((snap) => this.mapSnapshotToRow(snap));

    if (input.query.q) {
      const q = input.query.q.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.sourceId.toLowerCase().includes(q) ||
          (row.description ? row.description.toLowerCase().includes(q) : false) ||
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
    return sourceType === "income" ? "INVOICE" : "EXPENSE";
  }

  private mapSnapshotToRow(snapshot: {
    id: string;
    sourceType: string;
    sourceId: string;
    calculatedAt: Date;
    subtotalAmountCents: number;
    taxTotalAmountCents: number;
    totalAmountCents: number;
  }): TaxFilingItemRow {
    const sourceType: TaxFilingItemSourceType =
      snapshot.sourceType === "INVOICE" ? "income" : "expense";
    const deepLink =
      sourceType === "income" ? `/invoices/${snapshot.sourceId}` : `/expenses/${snapshot.sourceId}`;
    return {
      id: snapshot.id,
      sourceType,
      sourceId: snapshot.sourceId,
      date: snapshot.calculatedAt.toISOString(),
      counterparty: undefined,
      description: undefined,
      netCents: snapshot.subtotalAmountCents,
      taxCents: snapshot.taxTotalAmountCents,
      grossCents: snapshot.totalAmountCents,
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
