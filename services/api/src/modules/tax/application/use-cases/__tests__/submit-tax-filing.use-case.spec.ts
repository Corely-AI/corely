import { describe, expect, it } from "vitest";
import { isErr, ok } from "@corely/kernel";
import { SubmitTaxFilingUseCase } from "../submit-tax-filing.use-case";
import { TaxReportRepoPort } from "../../../domain/ports";
import { GetTaxFilingDetailUseCase } from "../get-tax-filing-detail.use-case";

class FakeTaxReportRepo extends TaxReportRepoPort {
  submitCalls: Array<Record<string, unknown>> = [];

  async findById() {
    return {
      id: "filing-1",
      tenantId: "workspace-1",
      type: "VAT_ADVANCE",
      group: "VAT",
      periodLabel: "January 2025",
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-01-31T23:59:59.999Z"),
      dueDate: new Date("2025-02-10T23:59:59.999Z"),
      status: "OPEN",
      amountEstimatedCents: null,
      amountFinalCents: null,
      currency: "EUR",
      meta: { issues: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
      submissionReference: null,
      submissionNotes: null,
    };
  }

  async submitReport(input: Record<string, unknown>) {
    this.submitCalls.push(input);
  }

  async updateMeta() {}
  async listByStatus() {
    return [];
  }
  async markSubmitted() {}
  async markPaid() {}
  async delete() {}
  async listByPeriodRange() {
    return [];
  }
  async upsertByPeriod() {
    throw new Error("not used");
  }
  async seedDefaultReports() {}
}

class FakeGetTaxFilingDetailUseCase {
  async execute() {
    return ok({
      filing: {
        id: "filing-1",
      },
    });
  }
}

const outbox = {
  enqueue: async () => undefined,
};

const audit = {
  log: async () => undefined,
};

describe("SubmitTaxFilingUseCase", () => {
  it("rejects ELSTER on the manual bookkeeping endpoint", async () => {
    const useCase = new SubmitTaxFilingUseCase(
      new FakeTaxReportRepo(),
      new FakeGetTaxFilingDetailUseCase() as unknown as GetTaxFilingDetailUseCase,
      outbox,
      audit
    );

    const result = await useCase.execute(
      {
        filingId: "filing-1",
        request: {
          method: "elster",
          submittedAt: "2026-03-11T12:00:00.000Z",
          submissionId: "tx-1",
        },
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("Tax:ManualSubmissionOnly");
    }
  });

  it("stores manual submission metadata explicitly as manual", async () => {
    const repo = new FakeTaxReportRepo();
    const useCase = new SubmitTaxFilingUseCase(
      repo,
      new FakeGetTaxFilingDetailUseCase() as unknown as GetTaxFilingDetailUseCase,
      outbox,
      audit
    );

    const result = await useCase.execute(
      {
        filingId: "filing-1",
        request: {
          method: "manual",
          submittedAt: "2026-03-11T12:00:00.000Z",
          submissionId: "manual-1",
        },
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect(isErr(result)).toBe(false);
    expect(repo.submitCalls).toHaveLength(1);
    expect(repo.submitCalls[0]?.submissionMethod).toBe("manual");
    expect(repo.submitCalls[0]?.submissionMeta).toEqual({ channel: "manual" });
  });
});
