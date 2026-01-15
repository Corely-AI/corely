import { describe, it, expect, beforeEach } from "vitest";
import { PersonalTaxStrategy } from "../personal-tax-strategy";
import {
  TaxSummaryQueryPort,
  TaxReportRepoPort,
  TaxProfileRepoPort,
  TaxCodeRepoPort,
  TaxRateRepoPort,
} from "../../../domain/ports";
import type { TaxReportEntity, TaxProfileEntity } from "../../../domain/entities";
import type { TaxSummaryTotals } from "../../../domain/ports/tax-summary-query.port";
import { DEPackV1 } from "../jurisdictions/de-pack.v1";
import { InMemoryTaxCodeRepo } from "../../../testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../../testkit/fakes/in-memory-tax-rate-repo";

class FakeSummaryQuery extends TaxSummaryQueryPort {
  constructor(private totals: TaxSummaryTotals) {
    super();
  }
  setTotals(totals: TaxSummaryTotals) {
    this.totals = totals;
  }
  async getTotals(_tenantId: string): Promise<TaxSummaryTotals> {
    return this.totals;
  }
}

class FakeReportRepo extends TaxReportRepoPort {
  reports: TaxReportEntity[] = [];

  async listByStatus(
    _tenantId: string,
    status: "upcoming" | "submitted"
  ): Promise<TaxReportEntity[]> {
    if (status === "submitted") {
      return this.reports.filter((r) => r.status === "SUBMITTED");
    }
    return this.reports.filter((r) => r.status !== "SUBMITTED");
  }

  async markSubmitted(tenantId: string, id: string, submittedAt: Date): Promise<TaxReportEntity> {
    const report = this.reports.find((r) => r.id === id && r.tenantId === tenantId);
    if (!report) {
      throw new Error("Report not found");
    }
    report.status = "SUBMITTED";
    report.submittedAt = submittedAt;
    report.updatedAt = submittedAt;
    return report;
  }

  async seedDefaultReports(tenantId: string): Promise<void> {
    if (this.reports.length > 0) return;
    const now = new Date("2025-02-10T00:00:00Z");
    this.reports.push(
      {
        id: "r1",
        tenantId,
        type: "VAT_ADVANCE",
        group: "ADVANCE_VAT",
        periodLabel: "Q1 2025",
        periodStart: new Date("2025-01-01T00:00:00Z"),
        periodEnd: new Date("2025-03-31T00:00:00Z"),
        dueDate: new Date("2025-04-10T00:00:00Z"),
        status: "OPEN",
        amountEstimatedCents: null,
        amountFinalCents: null,
        currency: "EUR",
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
      },
      {
        id: "r2",
        tenantId,
        type: "VAT_ANNUAL",
        group: "ANNUAL_REPORT",
        periodLabel: "2025",
        periodStart: new Date("2025-01-01T00:00:00Z"),
        periodEnd: new Date("2025-12-31T00:00:00Z"),
        dueDate: new Date("2026-02-10T00:00:00Z"),
        status: "UPCOMING",
        amountEstimatedCents: null,
        amountFinalCents: null,
        currency: "EUR",
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
      }
    );
  }
}

class FakeProfileRepo extends TaxProfileRepoPort {
  profile: TaxProfileEntity | null = null;

  async getActive(tenantId: string, at: Date): Promise<TaxProfileEntity | null> {
    if (
      this.profile &&
      this.profile.tenantId === tenantId &&
      this.profile.effectiveFrom <= at &&
      (!this.profile.effectiveTo || this.profile.effectiveTo >= at)
    ) {
      return this.profile;
    }
    return null;
  }

  async upsert(profile: Omit<TaxProfileEntity, "id" | "createdAt" | "updatedAt">) {
    this.profile = {
      ...profile,
      id: "profile-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.profile;
  }

  async findById(id: string, tenantId: string): Promise<TaxProfileEntity | null> {
    if (this.profile && this.profile.id === id && this.profile.tenantId === tenantId) {
      return this.profile;
    }
    return null;
  }
}

describe("PersonalTaxStrategy.computeSummary", () => {
  const tenantId = "tenant-1";
  let summaryQuery: FakeSummaryQuery;
  let reportRepo: FakeReportRepo;
  let profileRepo: FakeProfileRepo;
  let taxCodeRepo: TaxCodeRepoPort;
  let taxRateRepo: TaxRateRepoPort;
  let strategy: PersonalTaxStrategy;

  beforeEach(async () => {
    summaryQuery = new FakeSummaryQuery({
      incomeTotalCents: 0,
      unpaidInvoicesCount: 0,
      expensesTotalCents: 0,
      expenseItemsToReviewCount: 0,
    });
    reportRepo = new FakeReportRepo();
    profileRepo = new FakeProfileRepo();
    taxCodeRepo = new InMemoryTaxCodeRepo();
    taxRateRepo = new InMemoryTaxRateRepo();

    // Seed default tax code/rate for DE standard VAT
    const code = await taxCodeRepo.create({
      tenantId,
      code: "STANDARD_19",
      kind: "STANDARD",
      label: "Standard 19%",
      isActive: true,
    });
    await taxRateRepo.create({
      tenantId,
      taxCodeId: code.id,
      rateBps: 1900,
      effectiveFrom: new Date("2024-01-01T00:00:00Z"),
      effectiveTo: null,
    });

    strategy = new PersonalTaxStrategy(
      summaryQuery,
      reportRepo,
      profileRepo,
      new DEPackV1(taxCodeRepo, taxRateRepo)
    );
  });

  it("computes VAT payable when profile is configured for standard VAT", async () => {
    await profileRepo.upsert({
      tenantId,
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: "DE123",
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      taxYearStartMonth: 1,
      localTaxOfficeName: "Berlin",
      effectiveFrom: new Date("2024-01-01T00:00:00Z"),
      effectiveTo: null,
    });
    summaryQuery.setTotals({
      incomeTotalCents: 200_000,
      unpaidInvoicesCount: 2,
      expensesTotalCents: 0,
      expenseItemsToReviewCount: 0,
    });

    const summary = await strategy.computeSummary({ tenantId });

    expect(summary.configurationStatus).toBe("READY");
    expect(summary.taxesToBePaidEstimatedCents).toBe(38_000); // 19% of 200k
    expect(summary.upcomingReportsPreview[0].amountEstimatedCents).toBe(38_000);
    expect(summary.warnings.length).toBeGreaterThan(0);
  });

  it("indicates missing settings when no profile exists", async () => {
    summaryQuery.setTotals({
      incomeTotalCents: 100_000,
      unpaidInvoicesCount: 1,
      expensesTotalCents: 0,
      expenseItemsToReviewCount: 0,
    });

    const summary = await strategy.computeSummary({ tenantId });

    expect(summary.configurationStatus).toBe("MISSING_SETTINGS");
    expect(summary.taxesToBePaidEstimatedCents).toBe(0);
    expect(summary.warnings).toContain("Tax profile is not configured");
  });

  it("marks VAT as not applicable for small business regime", async () => {
    await profileRepo.upsert({
      tenantId,
      country: "DE",
      regime: "SMALL_BUSINESS",
      vatEnabled: false,
      vatId: null,
      currency: "EUR",
      filingFrequency: "YEARLY",
      taxYearStartMonth: 1,
      localTaxOfficeName: "Berlin",
      effectiveFrom: new Date("2024-01-01T00:00:00Z"),
      effectiveTo: null,
    });
    summaryQuery.setTotals({
      incomeTotalCents: 150_000,
      unpaidInvoicesCount: 1,
      expensesTotalCents: 0,
      expenseItemsToReviewCount: 0,
    });

    const summary = await strategy.computeSummary({ tenantId });

    expect(summary.configurationStatus).toBe("NOT_APPLICABLE");
    expect(summary.taxesToBePaidEstimatedCents).toBe(0);
    expect(summary.warnings[0]).toMatch(/VAT is not applicable/i);
  });

  it("handles expenses present while keeping input VAT warning", async () => {
    await profileRepo.upsert({
      tenantId,
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: "DE123",
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      taxYearStartMonth: 1,
      localTaxOfficeName: "Berlin",
      effectiveFrom: new Date("2024-01-01T00:00:00Z"),
      effectiveTo: null,
    });
    summaryQuery.setTotals({
      incomeTotalCents: 100_000,
      unpaidInvoicesCount: 1,
      expensesTotalCents: 50_000,
      expenseItemsToReviewCount: 2,
    });

    const summary = await strategy.computeSummary({ tenantId });

    expect(summary.configurationStatus).toBe("READY");
    expect(summary.taxesToBePaidEstimatedCents).toBe(19_000);
    expect(summary.expenseItemsToReviewCount).toBe(2);
    expect(summary.warnings.some((w) => w.includes("Input VAT"))).toBe(true);
  });
});
