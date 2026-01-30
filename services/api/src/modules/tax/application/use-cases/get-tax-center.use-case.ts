import { Injectable } from "@nestjs/common";
import {
  GetTaxCenterInput,
  GetTaxCenterOutput,
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

@RequireTenant()
@Injectable()
export class GetTaxCenterUseCase extends BaseUseCase<GetTaxCenterInput, GetTaxCenterOutput> {
  constructor(
    private readonly listFilingsUseCase: ListTaxFilingsUseCase,
    private readonly getSummaryUseCase: GetTaxSummaryUseCase
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
    const annualFilingsResult = await this.listFilingsUseCase.execute(
      {
        year: annualYear,
        page: 1,
        pageSize: 50,
      },
      ctx
    );

    let annualItems: TaxFilingSummary[] = [];
    if (annualFilingsResult && "value" in annualFilingsResult) {
      annualItems = annualFilingsResult.value.items.filter((f) =>
        ["vat-annual", "income-annual", "year-end", "corporate-annual", "trade"].includes(f.type)
      );
    }

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
          dueDate: f.dueDate,
          status: f.status,
          amountCents: f.amountCents ?? 0,
          currency: f.currency,
        })),
        totalCount: annualItems.length,
      },
      issues,
      snapshot,
      shortcutsHints: ["create-filing", "export-report"],
    });
  }
}
