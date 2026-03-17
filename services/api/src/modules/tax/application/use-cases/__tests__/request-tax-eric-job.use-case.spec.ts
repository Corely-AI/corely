import { describe, expect, it } from "vitest";
import { ok, isErr } from "@corely/kernel";
import { RequestTaxEricJobUseCase } from "../request-tax-eric-job.use-case";
import { TaxProfileRepoPort, TaxReportRepoPort, TaxEricJobRepoPort } from "../../../domain/ports";
import { GetTaxFilingDetailUseCase } from "../get-tax-filing-detail.use-case";
import { TaxElsterGatewayPort } from "../../ports/tax-elster-gateway.port";
import { TaxElsterSubmissionBuilderPort } from "../../ports/tax-elster-submission-builder.port";

class FakeReportRepo extends TaxReportRepoPort {
  async findById(_tenantId: string, id: string) {
    return {
      id,
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
      meta: {
        lastRecalculatedAt: "2026-03-11T12:00:00.000Z",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: null,
      submissionReference: null,
      submissionNotes: null,
    };
  }

  async listByStatus() {
    return [];
  }
  async markSubmitted() {}
  async submitReport() {}
  async markPaid() {}
  async updateMeta() {}
  async delete() {}
  async listByPeriodRange() {
    return [];
  }
  async upsertByPeriod() {
    throw new Error("not used");
  }
  async seedDefaultReports() {}
}

class FakeTaxProfileRepo extends TaxProfileRepoPort {
  async getActive() {
    return {
      country: "DE",
    };
  }

  async upsert() {
    throw new Error("not used");
  }

  async findById() {
    return null;
  }
}

class FakeTaxEricJobRepo extends TaxEricJobRepoPort {
  created: Record<string, unknown>[] = [];
  existingJob: ReturnType<this["buildJob"]> | null = null;

  private buildJob(id: string) {
    return {
      id,
      tenantId: "workspace-1",
      filingId: "filing-1",
      reportId: "filing-1",
      reportType: "vat_advance_report" as const,
      declarationType: "de-ustva" as const,
      action: "validate" as const,
      status: "queued" as const,
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      payloadVersion: "de-ustva-v2026.1",
      requestHash: "hash-1",
      certificateReferenceId: "cert-1",
      gatewayVersion: null,
      ericVersion: null,
      transferReference: null,
      outcome: null,
      resultCodes: [],
      messages: [],
      requestPayload: {},
      responsePayload: null,
      technicalDetails: null,
      errorMessage: null,
      artifacts: [],
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      updatedAt: new Date(),
    };
  }

  async create(params: Record<string, unknown>) {
    this.created.push(params);
    return this.buildJob(String(params.jobId));
  }

  async findById() {
    return null;
  }

  async listByReport() {
    return [];
  }

  async findLatestByIdempotencyKey() {
    return this.existingJob;
  }

  async markRunning() {}
  async markCompleted() {}
  async markFailed() {}
}

class FakeFilingDetailUseCase {
  async execute() {
    return ok({
      filing: {
        id: "filing-1",
        type: "vat",
        status: "readyForReview",
        periodLabel: "January 2025",
        periodKey: "2025-01",
        year: 2025,
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-01-31T23:59:59.999Z",
        dueDate: "2025-02-10T23:59:59.999Z",
        totals: {
          salesNetCents: 500000,
          purchaseNetCents: 100000,
          vatCollectedCents: 95000,
          vatPaidCents: 19000,
          netPayableCents: 76000,
          currency: "EUR",
          lastRecalculatedAt: "2026-03-11T12:00:00.000Z",
        },
        issues: [],
        exports: {
          csv: {
            available: true,
          },
          elsterXml: {
            available: true,
          },
        },
      },
    });
  }
}

class FakeGateway extends TaxElsterGatewayPort {
  constructor(private readonly status: "connected" | "notConfigured") {
    super();
  }

  getConnectionStatus() {
    return this.status;
  }

  async execute() {
    throw new Error("not used");
  }
}

class FakeSubmissionBuilder extends TaxElsterSubmissionBuilderPort {
  build(input: Parameters<TaxElsterSubmissionBuilderPort["build"]>[0]) {
    return {
      requestId: input.requestId,
      jobId: input.requestId,
      correlationId: input.correlationId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      filingId: input.filing.id,
      reportId: input.report.id,
      reportType: "vat_advance_report" as const,
      declarationType: "de-ustva" as const,
      operation: input.operation,
      payloadVersion: "de-ustva-v2026.1",
      certificateReferenceId: "cert-1",
      period: {
        taxYear: 2025,
      },
      payload: {
        declarationType: "de-ustva" as const,
        payloadVersion: "de-ustva-v2026.1",
        jurisdiction: "DE",
        filingType: "vat" as const,
        currency: "EUR",
        periodLabel: "January 2025",
        totals: {
          vatCollectedCents: 95000,
          vatPaidCents: 19000,
          netPayableCents: 76000,
          salesNetCents: 500000,
          purchaseNetCents: 100000,
        },
        kennzifferRows: [],
      },
      metadata: {
        source: "corely-tax",
        requestId: input.requestId,
        correlationId: input.correlationId,
        requestedAt: "2026-03-11T12:00:00.000Z",
      },
    };
  }
}

const outbox = {
  enqueue: async () => undefined,
};

const audit = {
  log: async () => undefined,
};

describe("RequestTaxEricJobUseCase", () => {
  it("rejects ELSTER job creation when the external gateway is not configured", async () => {
    const useCase = new RequestTaxEricJobUseCase(
      new FakeReportRepo(),
      new FakeTaxProfileRepo(),
      new FakeTaxEricJobRepo(),
      new FakeFilingDetailUseCase() as unknown as GetTaxFilingDetailUseCase,
      new FakeSubmissionBuilder(),
      new FakeGateway("notConfigured"),
      outbox,
      audit
    );

    const result = await useCase.execute(
      {
        filingId: "filing-1",
        reportId: "filing-1",
        action: "validate",
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("Tax:ElsterNotConfigured");
    }
  });

  it("returns the existing job for the same idempotency key", async () => {
    const repo = new FakeTaxEricJobRepo();
    repo.existingJob = {
      id: "job-existing",
      tenantId: "workspace-1",
      filingId: "filing-1",
      reportId: "filing-1",
      reportType: "vat_advance_report",
      declarationType: "de-ustva",
      action: "validate",
      status: "queued",
      correlationId: "corr-1",
      idempotencyKey: "idem-1",
      payloadVersion: "de-ustva-v2026.1",
      requestHash: "hash-1",
      certificateReferenceId: "cert-1",
      gatewayVersion: null,
      ericVersion: null,
      transferReference: null,
      outcome: null,
      resultCodes: [],
      messages: [],
      requestPayload: {},
      responsePayload: null,
      technicalDetails: null,
      errorMessage: null,
      artifacts: [],
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      updatedAt: new Date(),
    };

    const useCase = new RequestTaxEricJobUseCase(
      new FakeReportRepo(),
      new FakeTaxProfileRepo(),
      repo,
      new FakeFilingDetailUseCase() as unknown as GetTaxFilingDetailUseCase,
      new FakeSubmissionBuilder(),
      new FakeGateway("connected"),
      outbox,
      audit
    );

    const result = await useCase.execute(
      {
        filingId: "filing-1",
        reportId: "filing-1",
        action: "validate",
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        correlationId: "corr-1",
        idempotencyKey: "idem-1",
        metadata: {},
      } as {
        tenantId: string;
        workspaceId: string;
        userId: string;
        correlationId: string;
        idempotencyKey: string;
        metadata: Record<string, unknown>;
      }
    );

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      expect(result.value.job.id).toBe("job-existing");
    }
    expect(repo.created).toHaveLength(0);
  });
});
