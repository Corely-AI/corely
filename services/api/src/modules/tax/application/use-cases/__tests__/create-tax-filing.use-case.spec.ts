import { describe, it, expect, beforeEach } from "vitest";
import { isErr } from "@corely/kernel";
import { CreateTaxFilingUseCase } from "../create-tax-filing.use-case";
import { TaxReportRepoPort, TaxProfileRepoPort, VatPeriodQueryPort } from "../../../domain/ports";
import { VatPeriodResolver } from "../../../domain/services/vat-period.resolver";
import { ReportRegistry } from "../../../domain/reporting/report-registry";
import { IncomeTaxDeStrategy } from "../../../domain/reporting/strategies/de/income-tax-de.strategy";
import { VatAnnualDeStrategy } from "../../../domain/reporting/strategies/de/vat-annual-de.strategy";

class FakeTaxReportRepo extends TaxReportRepoPort {
  reports: any[] = [];
  upserts: any[] = [];

  async listByStatus(): Promise<any[]> {
    return [];
  }

  async findById(): Promise<any | null> {
    return null;
  }

  async markSubmitted(): Promise<any> {
    throw new Error("not used");
  }

  async submitReport(): Promise<any> {
    throw new Error("not used");
  }

  async markPaid(): Promise<any> {
    throw new Error("not used");
  }

  async updateMeta(): Promise<any> {
    throw new Error("not used");
  }

  async delete(): Promise<void> {
    return;
  }

  async listByPeriodRange(_tenantId: string, type: string, start: Date, end: Date): Promise<any[]> {
    return this.reports.filter(
      (report) =>
        report.type === type &&
        report.periodStart.getTime() >= start.getTime() &&
        report.periodStart.getTime() < end.getTime()
    );
  }

  async upsertByPeriod(input: any): Promise<any> {
    this.upserts.push(input);
    const created = {
      id: `report-${this.upserts.length}`,
      tenantId: input.tenantId,
      type: input.type,
      group: input.group,
      periodLabel: input.periodLabel,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      dueDate: input.dueDate,
      status: input.status,
      amountEstimatedCents: null,
      amountFinalCents: input.amountFinalCents ?? null,
      currency: "EUR",
      submittedAt: input.submittedAt ?? null,
      submissionReference: input.submissionReference ?? null,
      submissionNotes: input.submissionNotes ?? null,
      archivedReason: input.archivedReason ?? null,
      pdfStorageKey: null,
      pdfGeneratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reports.push(created);
    return created;
  }

  async seedDefaultReports(): Promise<void> {
    return;
  }
}

class FakeTaxProfileRepo extends TaxProfileRepoPort {
  async getActive(): Promise<any> {
    return {
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
    };
  }

  async upsert(): Promise<any> {
    throw new Error("not used");
  }

  async findById(): Promise<any | null> {
    return null;
  }
}

class FakeVatPeriodQuery extends VatPeriodQueryPort {
  async getInputs(): Promise<any> {
    return {
      salesNetCents: 0,
      salesVatCents: 0,
      purchaseNetCents: 0,
      purchaseVatCents: 0,
    };
  }

  async getDetails(): Promise<any> {
    return { sales: [], purchases: [] };
  }
}

describe("CreateTaxFilingUseCase", () => {
  let reportRepo: FakeTaxReportRepo;
  let useCase: CreateTaxFilingUseCase;

  beforeEach(() => {
    reportRepo = new FakeTaxReportRepo();

    const registry = new ReportRegistry();
    registry.register(new IncomeTaxDeStrategy());
    registry.register(new VatAnnualDeStrategy(new FakeVatPeriodQuery()));

    useCase = new CreateTaxFilingUseCase(
      reportRepo,
      new FakeTaxProfileRepo(),
      new VatPeriodResolver(),
      registry
    );
  });

  it("uses July 31 of the following year for 2025 annual freelancer filings", async () => {
    const result = await useCase.execute({ type: "income-annual", year: 2025 }, {
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
    } as any);

    expect(isErr(result)).toBe(false);
    expect(reportRepo.upserts).toHaveLength(1);
    expect(reportRepo.upserts[0].periodEnd.toISOString()).toBe("2025-12-31T23:59:59.999Z");
    expect(reportRepo.upserts[0].dueDate.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });

  it("treats an existing annual filing for the same year as a duplicate even when periodEnd differs", async () => {
    reportRepo.reports.push({
      id: "existing-1",
      tenantId: "workspace-1",
      type: "VAT_ANNUAL",
      group: "ANNUAL_REPORT",
      periodLabel: "2025",
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-12-31T00:00:00.000Z"),
      dueDate: new Date("2026-05-31T00:00:00.000Z"),
      status: "OPEN",
      amountEstimatedCents: null,
      amountFinalCents: null,
      currency: "EUR",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute({ type: "vat-annual", year: 2025 }, {
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
    } as any);

    expect(isErr(result)).toBe(true);
    expect(reportRepo.upserts).toHaveLength(0);
  });
});
