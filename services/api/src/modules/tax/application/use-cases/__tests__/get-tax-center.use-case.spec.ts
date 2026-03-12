import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@corely/kernel";
import { GetTaxCenterUseCase } from "../get-tax-center.use-case";

describe("GetTaxCenterUseCase", () => {
  const listFilingsExecute = vi.fn();
  const getSummaryExecute = vi.fn();
  const generateReportsExecute = vi.fn();
  const getActiveProfile = vi.fn();

  let useCase: GetTaxCenterUseCase;

  beforeEach(() => {
    listFilingsExecute.mockReset();
    getSummaryExecute.mockReset();
    generateReportsExecute.mockReset();
    getActiveProfile.mockReset();

    let annualReadCount = 0;
    listFilingsExecute.mockImplementation(async (input: { year?: number }) => {
      if (input.year === 2026) {
        return ok({
          items: [],
          pageInfo: { page: 1, pageSize: 50, total: 0, hasNextPage: false },
        });
      }

      annualReadCount += 1;
      if (annualReadCount === 1) {
        return ok({
          items: [],
          pageInfo: { page: 1, pageSize: 50, total: 0, hasNextPage: false },
        });
      }

      return ok({
        items: [
          {
            id: "income-early",
            type: "income-annual",
            periodLabel: "2025",
            year: 2025,
            dueDate: "2026-05-31T00:00:00.000Z",
            status: "readyForReview",
            amountCents: null,
            currency: "EUR",
          },
          {
            id: "income-correct",
            type: "income-annual",
            periodLabel: "2025",
            year: 2025,
            dueDate: "2026-07-31T23:59:59.999Z",
            status: "readyForReview",
            amountCents: null,
            currency: "EUR",
          },
          {
            id: "vat-correct",
            type: "vat-annual",
            periodLabel: "2025",
            year: 2025,
            dueDate: "2026-07-31T23:59:59.999Z",
            status: "readyForReview",
            amountCents: null,
            currency: "EUR",
          },
        ],
        pageInfo: { page: 1, pageSize: 50, total: 3, hasNextPage: false },
      });
    });

    getSummaryExecute.mockResolvedValue(
      ok({
        taxesToBePaidEstimatedCents: 0,
        configurationStatus: "READY",
        warnings: [],
        incomeTotalCents: 0,
        unpaidInvoicesCount: 0,
        expensesTotalCents: 0,
        expenseItemsToReviewCount: 0,
        upcomingReportCount: 0,
        upcomingReportsPreview: [],
        localTaxOfficeName: null,
        workspaceKind: "PERSONAL",
      })
    );

    getActiveProfile.mockResolvedValue({
      id: "profile-1",
      tenantId: "workspace-1",
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: "DE123456789",
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      vatAccountingMethod: "IST",
      taxYearStartMonth: 1,
      localTaxOfficeName: null,
      vatExemptionParagraph: null,
      euB2BSales: false,
      hasEmployees: false,
      usesTaxAdvisor: false,
      effectiveFrom: new Date("2024-01-01T00:00:00.000Z"),
      effectiveTo: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    });

    const UseCaseCtor = GetTaxCenterUseCase as unknown as new (
      ...args: unknown[]
    ) => GetTaxCenterUseCase;
    useCase = new UseCaseCtor(
      { execute: listFilingsExecute },
      { execute: getSummaryExecute },
      { execute: generateReportsExecute },
      { getActive: getActiveProfile }
    );
  });

  it("generates missing annual reports for the selected year and deduplicates the returned items", async () => {
    const result = await useCase.execute({ year: 2026, annualYear: 2025, entityId: "entity-1" }, {
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
    } as any);

    expect("value" in result).toBe(true);
    if (!("value" in result)) {
      return;
    }

    expect(generateReportsExecute).toHaveBeenCalledWith({
      tenantId: "workspace-1",
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-12-31T23:59:59.999Z"),
      periodLabel: "2025",
      types: ["VAT_ANNUAL", "INCOME_TAX"],
    });
    expect(result.value.annual.items).toEqual([
      expect.objectContaining({
        id: "vat-correct",
        type: "vat-annual",
        dueDate: "2026-07-31T23:59:59.999Z",
        href: "/tax/filings/vat-correct",
      }),
      expect.objectContaining({
        id: "eur-2025",
        type: "profit-loss",
        dueDate: "2026-07-31T23:59:59.999Z",
        href: "/tax/reports/eur?year=2025",
      }),
      expect.objectContaining({
        id: "income-correct",
        type: "income-annual",
        dueDate: "2026-07-31T23:59:59.999Z",
        href: "/tax/filings/income-correct",
      }),
    ]);
  });

  it("still returns VAT, EÜR, and income annual items when no historical profile exists for that year", async () => {
    getActiveProfile.mockResolvedValue(null);
    listFilingsExecute.mockImplementation(async (input: { year?: number }) => {
      if (input.year === 2026) {
        return ok({
          items: [],
          pageInfo: { page: 1, pageSize: 50, total: 0, hasNextPage: false },
        });
      }

      return ok({
        items: [],
        pageInfo: { page: 1, pageSize: 50, total: 0, hasNextPage: false },
      });
    });

    const result = await useCase.execute({ year: 2026, annualYear: 2022, entityId: "entity-1" }, {
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
    } as any);

    expect("value" in result).toBe(true);
    if (!("value" in result)) {
      return;
    }

    expect(result.value.annual.items.map((item) => item.type)).toEqual([
      "vat-annual",
      "profit-loss",
      "income-annual",
    ]);
  });
});
