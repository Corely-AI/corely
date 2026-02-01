import { Injectable } from "@nestjs/common";
import {
  ListTaxPaymentsInput,
  ListTaxPaymentsOutput,
  type FilterSpec,
  type TaxReportType,
  type TaxFilingType,
  type TaxPaymentRow,
  type TaxPaymentStatus,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxProfileRepoPort, TaxReportRepoPort } from "../../domain/ports";

type PaymentRecord = TaxPaymentRow & {
  year?: number;
  submissionReference?: string | null;
  submissionNotes?: string | null;
};

@RequireTenant()
@Injectable()
export class ListTaxPaymentsUseCase extends BaseUseCase<
  ListTaxPaymentsInput,
  ListTaxPaymentsOutput
> {
  constructor(
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxReportRepo: TaxReportRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ListTaxPaymentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListTaxPaymentsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;
    const now = new Date();
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const filters = Array.isArray(input.filters) ? (input.filters as FilterSpec[]) : [];

    const profile = await this.taxProfileRepo.getActive(workspaceId, now);
    const defaultCurrency = profile?.currency ?? "EUR";

    const reportTypes = this.resolveReportTypes(input.type);
    const reports = (
      await Promise.all(
        reportTypes.map((type) => {
          if (input.year) {
            return this.taxReportRepo.listByPeriodRange(
              workspaceId,
              type,
              new Date(Date.UTC(input.year, 0, 1)),
              new Date(Date.UTC(input.year + 1, 0, 1))
            );
          }
          return this.taxReportRepo.listByPeriodRange(
            workspaceId,
            type,
            new Date(0),
            new Date(Date.UTC(2100, 0, 1))
          );
        })
      )
    ).flat();

    const payments: PaymentRecord[] = reports
      .filter((report) => ["SUBMITTED", "PAID", "NIL"].includes(report.status))
      .map((report) => {
        const amountCents = report.amountFinalCents ?? report.amountEstimatedCents ?? 0;
        const direction = amountCents < 0 ? "receivable" : "payable";
        const paidAt =
          report.meta?.payment && typeof report.meta.payment === "object"
            ? String((report.meta.payment as { paidAt?: string }).paidAt ?? "")
            : "";
        const isPaid = report.status === "PAID" || Boolean(paidAt);
        const paymentStatus: TaxPaymentStatus = isPaid
          ? "paid"
          : report.dueDate < now
            ? "overdue"
            : "due";

        return {
          filingId: report.id,
          filingType: this.mapReportTypeToFilingType(report.type),
          periodLabel: report.periodLabel,
          dueDate: report.dueDate.toISOString(),
          amount: {
            value: Math.abs(amountCents) / 100,
            currency: report.currency ?? defaultCurrency,
            direction,
          },
          paymentStatus,
          paidAt: paidAt ? paidAt : null,
          method:
            report.meta?.payment && typeof report.meta.payment === "object"
              ? String((report.meta.payment as { method?: string }).method ?? "") || null
              : null,
          proofDocumentId:
            report.meta?.payment && typeof report.meta.payment === "object"
              ? ((report.meta.payment as { proofDocumentId?: string }).proofDocumentId ?? null)
              : null,
          year: report.periodStart.getUTCFullYear(),
          submissionReference: report.submissionReference ?? null,
          submissionNotes: report.submissionNotes ?? null,
        };
      });

    let results = payments;

    if (input.status) {
      results = results.filter((row) => row.paymentStatus === input.status);
    }
    if (input.type) {
      results = results.filter((row) => row.filingType === input.type);
    }
    if (input.year) {
      results = results.filter((row) => row.year === input.year);
    }

    const dueFrom = input.dueFrom ? new Date(input.dueFrom) : undefined;
    const dueTo = input.dueTo ? new Date(input.dueTo) : undefined;
    if (dueFrom || dueTo) {
      results = results.filter((row) => {
        const due = new Date(row.dueDate);
        if (dueFrom && due < dueFrom) {
          return false;
        }
        if (dueTo && due > dueTo) {
          return false;
        }
        return true;
      });
    }

    const paidFrom = input.paidFrom ? new Date(input.paidFrom) : undefined;
    const paidTo = input.paidTo ? new Date(input.paidTo) : undefined;
    if (paidFrom || paidTo) {
      results = results.filter((row) => {
        if (!row.paidAt) {
          return false;
        }
        const paid = new Date(row.paidAt);
        if (paidFrom && paid < paidFrom) {
          return false;
        }
        if (paidTo && paid > paidTo) {
          return false;
        }
        return true;
      });
    }

    if (filters.length > 0) {
      results = this.applyFilterSpecs(results, filters);
    }

    if (input.q) {
      const q = input.q.toLowerCase();
      results = results.filter((row) => {
        const submissionRef = row.submissionReference?.toLowerCase() ?? "";
        const submissionNotes = row.submissionNotes?.toLowerCase() ?? "";
        return (
          row.periodLabel.toLowerCase().includes(q) ||
          row.filingId.toLowerCase().includes(q) ||
          submissionRef.includes(q) ||
          submissionNotes.includes(q)
        );
      });
    }

    results = this.sortResults(results, input.sort);

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize).map(({ year, ...row }) => row);

    return ok({
      items: paginated,
      pageInfo: {
        page,
        pageSize,
        total,
        hasNextPage: start + pageSize < total,
      },
    });
  }

  private resolveReportTypes(type?: TaxFilingType): TaxReportType[] {
    if (!type) {
      return ["VAT_ADVANCE", "VAT_ANNUAL", "INCOME_TAX", "TRADE_TAX"];
    }
    switch (type) {
      case "vat":
        return ["VAT_ADVANCE"];
      case "vat-annual":
        return ["VAT_ANNUAL"];
      case "income-annual":
        return ["INCOME_TAX"];
      case "trade":
        return ["TRADE_TAX"];
      case "payroll":
        return ["PAYROLL_TAX"];
      case "year-end":
        return ["BALANCE_SHEET", "PROFIT_LOSS"];
      default:
        return [];
    }
  }

  private mapReportTypeToFilingType(type: TaxReportType): TaxFilingType {
    if (type === "VAT_ADVANCE") {
      return "vat";
    }
    if (type === "VAT_ANNUAL") {
      return "vat-annual";
    }
    if (type === "INCOME_TAX") {
      return "income-annual";
    }
    if (type === "TRADE_TAX") {
      return "trade";
    }
    if (type === "PAYROLL_TAX") {
      return "payroll";
    }
    return "other";
  }

  private applyFilterSpecs(items: PaymentRecord[], filters: FilterSpec[]): PaymentRecord[] {
    return items.filter((item) =>
      filters.every((filter) => {
        if (filter.field === "status" && (filter.operator === "eq" || filter.operator === "in")) {
          if (Array.isArray(filter.value)) {
            return filter.value.includes(item.paymentStatus);
          }
          return item.paymentStatus === filter.value;
        }
        if (filter.field === "type" && (filter.operator === "eq" || filter.operator === "in")) {
          if (Array.isArray(filter.value)) {
            return filter.value.includes(item.filingType);
          }
          return item.filingType === filter.value;
        }
        if (filter.field === "year" && (filter.operator === "eq" || filter.operator === "in")) {
          if (Array.isArray(filter.value)) {
            return filter.value.map(Number).includes(item.year ?? 0);
          }
          return Number(filter.value) === item.year;
        }
        if (filter.field === "dueDate") {
          return this.matchesDateFilter(item.dueDate, filter);
        }
        if (filter.field === "paidAt") {
          return item.paidAt ? this.matchesDateFilter(item.paidAt, filter) : false;
        }
        return true;
      })
    );
  }

  private matchesDateFilter(dateValue: string, filter: FilterSpec): boolean {
    const date = new Date(dateValue);
    if (filter.operator === "between") {
      const [from, to] = Array.isArray(filter.value) ? filter.value : [];
      if (from && new Date(from as string) > date) {
        return false;
      }
      if (to && new Date(to as string) < date) {
        return false;
      }
      return true;
    }
    if (filter.operator === "gte") {
      return new Date(filter.value as string) <= date;
    }
    if (filter.operator === "lte") {
      return new Date(filter.value as string) >= date;
    }
    if (filter.operator === "eq") {
      return new Date(filter.value as string).toDateString() === date.toDateString();
    }
    return true;
  }

  private sortResults(items: PaymentRecord[], sort?: string | string[]): PaymentRecord[] {
    const sortKey = Array.isArray(sort) ? sort[0] : sort;
    if (!sortKey) {
      return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }
    const [field, direction] = sortKey.split(":");
    const dir = direction === "desc" ? -1 : 1;

    return items.sort((a, b) => {
      if (field === "dueDate") {
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
      }
      if (field === "paidAt") {
        const left = a.paidAt ? new Date(a.paidAt).getTime() : 0;
        const right = b.paidAt ? new Date(b.paidAt).getTime() : 0;
        return (left - right) * dir;
      }
      if (field === "period") {
        return a.periodLabel.localeCompare(b.periodLabel) * dir;
      }
      if (field === "amount") {
        const left = a.amount.value ?? 0;
        const right = b.amount.value ?? 0;
        return (left - right) * dir;
      }
      return 0;
    });
  }
}
