import { Injectable } from "@nestjs/common";
import {
  GetTaxCenterInput,
  GetTaxCenterOutput,
  TaxCenterAnnualItem,
  TaxCenterIssue,
  TaxFilingSummary,
} from "@corely/contracts";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { ListTaxFilingsUseCase } from "./list-tax-filings.use-case";
import { GetTaxSummaryUseCase } from "./get-tax-summary.use-case";
import { GenerateTaxReportsUseCase } from "../services/generate-tax-reports.use-case";
import { TaxProfileRepoPort } from "../../domain/ports";

@RequireTenant()
@Injectable()
export class GetTaxCenterUseCase extends BaseUseCase<GetTaxCenterInput, GetTaxCenterOutput> {
  constructor(
    private readonly listFilingsUseCase: ListTaxFilingsUseCase,
    private readonly getSummaryUseCase: GetTaxSummaryUseCase,
    private readonly generateTaxReportsUseCase: GenerateTaxReportsUseCase,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: GetTaxCenterInput,
    ctx: UseCaseContext
  ): Promise<Result<GetTaxCenterOutput, UseCaseError>> {
    const now = new Date();
    const year = input.year ?? now.getUTCFullYear();

    const annualYear = input.annualYear ?? year;

    // 1. Get Next Up Filing (From existing logic) using 'year' (current context)
    const filingsResult = await this.listFilingsUseCase.execute(
      {
        year,
        page: 1,
        pageSize: 50,
      },
      ctx
    );

    let nextUp: TaxFilingSummary | null = null;

    if (filingsResult && "value" in filingsResult) {
      const allFilings = filingsResult.value.items;
      nextUp =
        allFilings.find((f) => ["draft", "needsFix", "readyForReview"].includes(f.status)) || null;
    }

    // 1b. Get Annual filings using 'annualYear'
    // We need to fetch specific year filings for the annual block if it differs from current year
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const annualItems = await this.loadAnnualItems(annualYear, workspaceId, ctx);

    // 2. Mock Issues
    const issues: TaxCenterIssue[] = [];
    const summaryResult = await this.getSummaryUseCase.execute(undefined, ctx);
    if (
      "value" in summaryResult &&
      summaryResult.value.configurationStatus === "MISSING_SETTINGS"
    ) {
      issues.push({
        id: "missing-conf",
        kind: "CONFIGURATION",
        severity: "error",
        count: 1,
        title: "Tax Profile Incomplete",
        description: "Please complete your tax profile settings.",
        deepLink: "/tax/settings",
        blocking: true,
      });
    }

    // 3. Mock Snapshot
    const snapshot = {
      kpis: [
        { key: "vatCollected", label: "VAT Collected", value: 125000, currency: "EUR" },
        { key: "vatPaid", label: "VAT Paid", value: 45000, currency: "EUR" },
        { key: "estPayable", label: "Est. Payable", value: 80000, currency: "EUR" },
      ],
      updatedAt: now.toISOString(),
    };

    return ok({
      mode: "FREELANCER",
      year,
      nextUp: nextUp
        ? {
            id: nextUp.id,
            type: nextUp.type,
            periodLabel: nextUp.periodLabel,
            dueDate: nextUp.dueDate,
            status: nextUp.status,
            amountCents: nextUp.amountCents ?? 0,
            currency: nextUp.currency,
          }
        : null,
      annual: {
        year: annualYear,
        items: annualItems.map((f) => ({
          id: f.id,
          type: f.type,
          periodLabel: f.periodLabel,
          year: f.year,
          dueDate: f.dueDate,
          status: f.status,
          amountCents: f.amountCents ?? null,
          currency: f.currency,
          href: f.href,
        })),
        totalCount: annualItems.length,
      },
      issues,
      snapshot,
      shortcutsHints: ["create-filing", "export-report"],
    });
  }

  private async loadAnnualItems(
    annualYear: number,
    workspaceId: string,
    ctx: UseCaseContext
  ): Promise<TaxCenterAnnualItem[]> {
    let annualFilings = await this.listAnnualItems(annualYear, ctx);
    const expectedTypes = await this.getExpectedAnnualTypes(annualYear, workspaceId);
    const missingExpectedType = expectedTypes.some(
      (type) => !annualFilings.some((item) => item.type === type)
    );

    if (missingExpectedType) {
      await this.generateTaxReportsUseCase.execute({
        tenantId: workspaceId,
        periodStart: new Date(Date.UTC(annualYear, 0, 1, 0, 0, 0, 0)),
        periodEnd: new Date(Date.UTC(annualYear, 11, 31, 23, 59, 59, 999)),
        periodLabel: String(annualYear),
        types: ["VAT_ANNUAL", "INCOME_TAX"],
      });
      annualFilings = await this.listAnnualItems(annualYear, ctx);
    }

    return this.buildAnnualItems({
      annualYear,
      workspaceId,
      filings: this.dedupeAnnualFilings(annualFilings),
    });
  }

  private async listAnnualItems(
    annualYear: number,
    ctx: UseCaseContext
  ): Promise<TaxFilingSummary[]> {
    const annualFilingsResult = await this.listFilingsUseCase.execute(
      {
        year: annualYear,
        page: 1,
        pageSize: 50,
      },
      ctx
    );

    if (!annualFilingsResult || !("value" in annualFilingsResult)) {
      return [];
    }

    return annualFilingsResult.value.items.filter((f) =>
      ["vat-annual", "income-annual", "year-end", "corporate-annual", "trade"].includes(f.type)
    );
  }

  private async getExpectedAnnualTypes(annualYear: number, workspaceId: string) {
    void annualYear;
    void workspaceId;
    return ["vat-annual", "income-annual"] as const;
  }

  private dedupeAnnualFilings(items: TaxFilingSummary[]): TaxFilingSummary[] {
    const deduped = new Map<string, TaxFilingSummary>();

    for (const item of items) {
      const key = `${item.type}:${item.year}`;
      const current = deduped.get(key);
      if (!current) {
        deduped.set(key, item);
        continue;
      }

      if (new Date(item.dueDate).getTime() >= new Date(current.dueDate).getTime()) {
        deduped.set(key, item);
      }
    }

    return Array.from(deduped.values()).sort(
      (left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
    );
  }

  private async buildAnnualItems(params: {
    annualYear: number;
    workspaceId: string;
    filings: TaxFilingSummary[];
  }): Promise<TaxCenterAnnualItem[]> {
    const profile = await this.taxProfileRepo.getActive(
      params.workspaceId,
      new Date(Date.UTC(params.annualYear, 11, 31, 23, 59, 59, 999))
    );

    const incomeFiling =
      params.filings.find((item) => item.type === "income-annual") ??
      this.createFallbackAnnualFiling(params.annualYear, "income-annual", profile?.usesTaxAdvisor);
    const vatFiling =
      params.filings.find((item) => item.type === "vat-annual") ??
      this.createFallbackAnnualFiling(params.annualYear, "vat-annual", profile?.usesTaxAdvisor);

    const items: TaxCenterAnnualItem[] = [];

    items.push(this.toAnnualItem(vatFiling, `/tax/filings/${vatFiling.id}`));

    items.push({
      id: `eur-${params.annualYear}`,
      type: "profit-loss",
      periodLabel: String(params.annualYear),
      year: params.annualYear,
      dueDate: incomeFiling.dueDate,
      status: incomeFiling.status,
      amountCents: incomeFiling.amountCents ?? null,
      currency: incomeFiling.currency,
      href: `/tax/reports/eur?year=${params.annualYear}`,
    });

    items.push(this.toAnnualItem(incomeFiling, `/tax/filings/${incomeFiling.id}`));

    return items;
  }

  private toAnnualItem(filing: TaxFilingSummary, href: string): TaxCenterAnnualItem {
    return {
      id: filing.id,
      type: filing.type as TaxCenterAnnualItem["type"],
      periodLabel: filing.periodLabel,
      year: filing.year ?? new Date(filing.dueDate).getUTCFullYear(),
      dueDate: filing.dueDate,
      status: filing.status,
      amountCents: filing.amountCents ?? null,
      currency: filing.currency,
      href,
    };
  }

  private createFallbackAnnualFiling(
    year: number,
    type: "vat-annual" | "income-annual",
    usesTaxAdvisor?: boolean
  ): TaxFilingSummary {
    const dueDate = new Date(
      Date.UTC(
        usesTaxAdvisor ? year + 2 : year + 1,
        usesTaxAdvisor ? 1 : 6,
        usesTaxAdvisor ? 28 : 31,
        23,
        59,
        59,
        999
      )
    );
    const now = new Date();

    return {
      id: `${type}-${year}`,
      type,
      periodLabel: String(year),
      year,
      dueDate: dueDate.toISOString(),
      status: now > dueDate ? "needsFix" : "readyForReview",
      amountCents: null,
      currency: "EUR",
    };
  }
}
