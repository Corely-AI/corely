import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ListVatPeriodsUseCase } from "../list-vat-periods.use-case";
import { VatPeriodResolver } from "../../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort, TaxReportRepoPort } from "../../../domain/ports";
import type { VatAccountingMethod, TaxReportStatus, ListVatPeriodsOutput } from "@corely/contracts";
import { isErr, type Result } from "@corely/kernel";

const unwrap = <T>(result: Result<T, any>): T => {
  if (isErr(result)) throw result.error;
  return result.value;
};

class FakeVatPeriodQuery extends VatPeriodQueryPort {
  async getInputs(_workspaceId: string, _start: Date, _end: Date, _method: VatAccountingMethod) {
    return {
      salesNetCents: 10_000,
      salesVatCents: 1_900,
      purchaseNetCents: 0,
      purchaseVatCents: 0,
    };
  }

  async getDetails() {
    return { sales: [], purchases: [] } as any;
  }
}

class FakeTaxProfileRepo extends TaxProfileRepoPort {
  async getActive() {
    return {
      id: "profile-1",
      tenantId: "workspace-1",
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: null,
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      vatAccountingMethod: "IST",
      taxYearStartMonth: 1,
      localTaxOfficeName: null,
      vatExemptionParagraph: null,
      effectiveFrom: new Date("2024-01-01T00:00:00Z"),
      effectiveTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  async upsert(_profile: any): Promise<any> {
    throw new Error("not used");
  }

  async findById() {
    return null;
  }
}

class FakeTaxReportRepo extends TaxReportRepoPort {
  reports: Array<{
    id: string;
    tenantId: string;
    type: string;
    group: string;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    status: TaxReportStatus;
    amountEstimatedCents: number | null;
    amountFinalCents?: number | null;
    currency: string;
    submittedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  async listByStatus() {
    return [] as any;
  }

  async markSubmitted(_tenantId: string, _id: string, _submittedAt: Date): Promise<any> {
    throw new Error("not used");
  }

  async seedDefaultReports(): Promise<void> {
    return;
  }

  async listByPeriodRange(): Promise<any[]> {
    return this.reports as any;
  }

  async upsertByPeriod(_input: any): Promise<any> {
    throw new Error("not used");
  }

  async findById(_tenantId: string, _id: string): Promise<any | null> {
    return null;
  }
}

describe("ListVatPeriodsUseCase", () => {
  let useCase: ListVatPeriodsUseCase;
  let reportRepo: FakeTaxReportRepo;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-05-15T00:00:00Z"));
    reportRepo = new FakeTaxReportRepo();
    useCase = new ListVatPeriodsUseCase(
      new VatPeriodResolver(),
      new FakeVatPeriodQuery(),
      new FakeTaxProfileRepo(),
      reportRepo
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks past quarters as overdue when no submission exists", async () => {
    const result = unwrap<ListVatPeriodsOutput>(
      await useCase.execute({ year: 2025, type: "VAT_QUARTERLY" }, {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      } as any)
    );

    const q1 = result.periods.find((period) => period.periodKey === "2025-Q1");
    const q2 = result.periods.find((period) => period.periodKey === "2025-Q2");

    expect(q1?.status).toBe("OVERDUE");
    expect(q2?.status).toBe("OPEN");
  });

  it("prefers submitted status when report record exists", async () => {
    reportRepo.reports.push({
      id: "r1",
      tenantId: "workspace-1",
      type: "VAT_ADVANCE",
      group: "ADVANCE_VAT",
      periodLabel: "Q1 2025",
      periodStart: new Date("2025-01-01T00:00:00Z"),
      periodEnd: new Date("2025-04-01T00:00:00Z"),
      dueDate: new Date("2025-04-10T00:00:00Z"),
      status: "SUBMITTED",
      amountEstimatedCents: null,
      amountFinalCents: 1900,
      currency: "EUR",
      submittedAt: new Date("2025-04-05T00:00:00Z"),
      createdAt: new Date("2025-04-05T00:00:00Z"),
      updatedAt: new Date("2025-04-05T00:00:00Z"),
    });

    const result = unwrap<ListVatPeriodsOutput>(
      await useCase.execute({ year: 2025, type: "VAT_QUARTERLY" }, {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      } as any)
    );

    const q1 = result.periods.find((period) => period.periodKey === "2025-Q1");
    expect(q1?.status).toBe("SUBMITTED");
  });
});
