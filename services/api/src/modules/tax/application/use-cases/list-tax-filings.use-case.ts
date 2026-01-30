import { Injectable } from "@nestjs/common";
import {
  ListTaxFilingsInput,
  ListTaxFilingsOutput,
  TaxFilingSummary,
  TaxFilingType,
  TaxFilingStatus,
  type FilterSpec,
  type TaxReportType,
} from "@corely/contracts";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxProfileRepoPort, TaxReportRepoPort } from "../../domain/ports";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class ListTaxFilingsUseCase extends BaseUseCase<ListTaxFilingsInput, ListTaxFilingsOutput> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxReportRepo: TaxReportRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: ListTaxFilingsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListTaxFilingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;
    const now = new Date();
    const year = input.year ?? now.getUTCFullYear();
    const filings: TaxFilingSummary[] = [];
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const filters = Array.isArray(input.filters) ? (input.filters as FilterSpec[]) : [];

    const profile = await this.taxProfileRepo.getActive(workspaceId, now);
    const currency = profile?.currency ?? "EUR";
    const vatFrequency = profile?.filingFrequency === "MONTHLY" ? "monthly" : "quarterly";

    const reportTypes = this.resolveReportTypes(input.type);
    const reports = (
      await Promise.all(
        reportTypes.map((type) =>
          this.taxReportRepo.listByPeriodRange(
            workspaceId,
            type,
            new Date(Date.UTC(year, 0, 1)),
            new Date(Date.UTC(year + 1, 0, 1))
          )
        )
      )
    ).flat();

    for (const report of reports) {
      const periodKey =
        report.type === "VAT_ADVANCE"
          ? this.toVatPeriodKey(report.periodStart, vatFrequency)
          : undefined;

      const status = this.mapReportStatus(report.status, report.dueDate, now);
      const summary: TaxFilingSummary = {
        id: report.id,
        type: this.mapReportTypeToFilingType(report.type),
        periodLabel: report.periodLabel,
        periodKey,
        year: report.periodStart.getUTCFullYear(),
        dueDate: report.dueDate.toISOString(),
        status,
        amountCents: report.amountFinalCents ?? report.amountEstimatedCents ?? null,
        currency: report.currency ?? currency,
      };

      if (input.periodKey) {
        if (!summary.periodKey || summary.periodKey !== input.periodKey) {
          continue;
        }
      }
      if (input.status && summary.status !== input.status) {
        continue;
      }

      filings.push(summary);
    }

    let results = this.applyFilterSpecs(filings, filters, input);

    if (input.q) {
      const q = input.q.toLowerCase();
      results = results.filter(
        (f) =>
          f.periodLabel.toLowerCase().includes(q) ||
          (f.periodKey ? f.periodKey.toLowerCase().includes(q) : false) ||
          f.id.toLowerCase().includes(q)
      );
    }

    results = this.sortResults(results, input.sort);

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

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
      return ["VAT_ADVANCE", "VAT_ANNUAL", "INCOME_TAX"];
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
    return "other";
  }

  private toVatPeriodKey(date: Date, frequency: "monthly" | "quarterly") {
    if (frequency === "monthly") {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }
    return this.periodResolver.resolveQuarter(date).key;
  }

  private mapReportStatus(status: string, dueDate: Date, now: Date): TaxFilingStatus {
    if (status === "PAID") {
      return "paid";
    }
    if (status === "SUBMITTED" || status === "NIL") {
      return "submitted";
    }
    if (status === "ARCHIVED") {
      return "archived";
    }
    if (status === "OVERDUE") {
      return "needsFix";
    }
    if (now > dueDate) {
      return "needsFix";
    }
    return "draft";
  }

  private applyFilterSpecs(
    items: TaxFilingSummary[],
    filters: FilterSpec[],
    input: ListTaxFilingsInput
  ): TaxFilingSummary[] {
    let results = items;

    const dueFrom = input.dueFrom ? new Date(input.dueFrom) : undefined;
    const dueTo = input.dueTo ? new Date(input.dueTo) : undefined;

    if (dueFrom || dueTo) {
      results = results.filter((item) => {
        const due = new Date(item.dueDate);
        if (dueFrom && due < dueFrom) {
          return false;
        }
        if (dueTo && due > dueTo) {
          return false;
        }
        return true;
      });
    }

    if (typeof input.needsAttention === "boolean") {
      results = results.filter((item) =>
        input.needsAttention ? item.status === "needsFix" : item.status !== "needsFix"
      );
    }

    if (typeof input.hasIssues === "boolean") {
      results = results.filter((item) =>
        input.hasIssues ? item.status === "needsFix" : item.status !== "needsFix"
      );
    }

    if (filters.length === 0) {
      return results;
    }

    return results.filter((item) =>
      filters.every((filter) => {
        if (filter.field === "status" && (filter.operator === "eq" || filter.operator === "in")) {
          if (Array.isArray(filter.value)) {
            return filter.value.includes(item.status);
          }
          return item.status === filter.value;
        }
        if (filter.field === "dueDate") {
          const due = new Date(item.dueDate);
          if (filter.operator === "between") {
            const [from, to] = Array.isArray(filter.value) ? filter.value : [];
            if (from && new Date(from) > due) {
              return false;
            }
            if (to && new Date(to) < due) {
              return false;
            }
            return true;
          }
          if (filter.operator === "gte") {
            return new Date(filter.value as string) <= due;
          }
          if (filter.operator === "lte") {
            return new Date(filter.value as string) >= due;
          }
          if (filter.operator === "eq") {
            return new Date(filter.value as string).toDateString() === due.toDateString();
          }
        }
        if (
          filter.field === "needsAttention" &&
          (filter.operator === "eq" || filter.operator === "in")
        ) {
          return String(filter.value) === "true"
            ? item.status === "needsFix"
            : item.status !== "needsFix";
        }
        if (
          filter.field === "hasIssues" &&
          (filter.operator === "eq" || filter.operator === "in")
        ) {
          return String(filter.value) === "true"
            ? item.status === "needsFix"
            : item.status !== "needsFix";
        }
        return true;
      })
    );
  }

  private sortResults(items: TaxFilingSummary[], sort?: string | string[]) {
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
      if (field === "period") {
        return a.periodLabel.localeCompare(b.periodLabel) * dir;
      }
      if (field === "amountCents") {
        const left = a.amountCents ?? 0;
        const right = b.amountCents ?? 0;
        return (left - right) * dir;
      }
      return 0;
    });
  }
}
