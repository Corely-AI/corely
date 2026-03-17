import { describe, expect, it } from "vitest";
import { ExternalServiceError } from "@corely/kernel";
import { TaxReportEricJobRequestedHandler } from "../tax-report-eric-job-requested.handler";
import { TaxElsterGatewayPort } from "@/modules/tax/application/ports/tax-elster-gateway.port";

class FakeTaxEricJobRepo {
  job = {
    id: "job-1",
    tenantId: "workspace-1",
    filingId: "filing-1",
    reportId: "report-1",
    reportType: "vat_advance_report" as const,
    declarationType: "de-ustva" as const,
    action: "submit" as const,
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
    requestPayload: {
      requestId: "req-1",
      jobId: "job-1",
      correlationId: "corr-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      filingId: "filing-1",
      reportId: "report-1",
      reportType: "vat_advance_report",
      declarationType: "de-ustva",
      operation: "submit",
      payloadVersion: "de-ustva-v2026.1",
      certificateReferenceId: "cert-1",
      period: {
        taxYear: 2025,
        filingPeriodKey: "2025-01",
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-01-31T23:59:59.999Z",
      },
      payload: {
        declarationType: "de-ustva",
        payloadVersion: "de-ustva-v2026.1",
        jurisdiction: "DE",
        filingType: "vat",
        currency: "EUR",
        periodLabel: "January 2025",
        totals: {
          vatCollectedCents: 100,
          vatPaidCents: 10,
          netPayableCents: 90,
          salesNetCents: 500,
          purchaseNetCents: 50,
        },
        kennzifferRows: [],
      },
      metadata: {
        source: "corely-tax",
        requestId: "req-1",
        correlationId: "corr-1",
        requestedAt: "2026-03-11T12:00:00.000Z",
      },
    },
    responsePayload: null,
    technicalDetails: null,
    errorMessage: null,
    artifacts: [],
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null,
    updatedAt: new Date(),
  };

  runningCalls = 0;
  completedCalls: Array<Record<string, unknown>> = [];
  failedCalls: Array<Record<string, unknown>> = [];

  async findById() {
    return this.job;
  }

  async markRunning() {
    this.runningCalls += 1;
  }

  async markCompleted(input: Record<string, unknown>) {
    this.completedCalls.push(input);
  }

  async markFailed(input: Record<string, unknown>) {
    this.failedCalls.push(input);
  }
}

class FakeTaxReportRepo {
  submitCalls: Array<Record<string, unknown>> = [];

  async submitReport(input: Record<string, unknown>) {
    this.submitCalls.push(input);
  }
}

class FakeGateway extends TaxElsterGatewayPort {
  constructor(
    private readonly result:
      | Record<string, unknown>
      | ExternalServiceError
      | (() => Promise<Record<string, unknown>>)
  ) {
    super();
  }

  getConnectionStatus() {
    return "connected" as const;
  }

  async execute() {
    if (this.result instanceof ExternalServiceError) {
      throw this.result;
    }
    if (typeof this.result === "function") {
      return this.result() as Promise<any>;
    }
    return this.result as any;
  }
}

class FakeObjectStorage {
  provider() {
    return "gcs" as const;
  }

  bucket() {
    return "bucket-1";
  }

  async createSignedUploadUrl() {
    throw new Error("not used");
  }

  async createSignedDownloadUrl() {
    throw new Error("not used");
  }

  async headObject() {
    throw new Error("not used");
  }

  async getObject() {
    throw new Error("not used");
  }

  async putObject(args: { bytes: Buffer }) {
    return {
      sizeBytes: args.bytes.length,
    };
  }
}

class FakeDocumentRepo {
  docs: string[] = [];

  async create(document: { id: string }) {
    this.docs.push(document.id);
  }
}

class FakeFileRepo {
  files: string[] = [];

  async create(file: { id: string }) {
    this.files.push(file.id);
  }
}

const audit = {
  log: async () => undefined,
};

const outbox = {
  events: [] as Array<Record<string, unknown>>,
  enqueue: async function (event: Record<string, unknown>) {
    this.events.push(event);
  },
};

const baseResult = {
  requestId: "req-1",
  jobId: "job-1",
  correlationId: "corr-1",
  declarationType: "de-ustva" as const,
  gatewayStatus: "completed" as const,
  operation: "submit" as const,
  retryable: false,
  resultCodes: [],
  messages: [],
  artifacts: [],
  rawMetadata: {},
  startedAt: "2026-03-11T12:00:00.000Z",
  finishedAt: "2026-03-11T12:00:01.000Z",
};

describe("TaxReportEricJobRequestedHandler", () => {
  it("persists a successful submit result and marks the report as ELSTER-submitted", async () => {
    const jobRepo = new FakeTaxEricJobRepo();
    const reportRepo = new FakeTaxReportRepo();
    const handler = new TaxReportEricJobRequestedHandler(
      jobRepo as any,
      reportRepo as any,
      new FakeGateway({
        ...baseResult,
        outcome: "success",
        transferReference: "tx-1",
      }) as any,
      new FakeObjectStorage() as any,
      new FakeDocumentRepo() as any,
      new FakeFileRepo() as any,
      audit as any,
      outbox as any
    );

    await handler.handle({
      tenantId: "workspace-1",
      payload: {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        filingId: "filing-1",
        reportId: "report-1",
        jobId: "job-1",
      },
    } as any);

    expect(jobRepo.completedCalls).toHaveLength(1);
    expect(reportRepo.submitCalls).toHaveLength(1);
    expect(reportRepo.submitCalls[0]?.submissionMethod).toBe("elster");
  });

  it("marks validation failures without submitting the report", async () => {
    const jobRepo = new FakeTaxEricJobRepo();
    const reportRepo = new FakeTaxReportRepo();
    const handler = new TaxReportEricJobRequestedHandler(
      jobRepo as any,
      reportRepo as any,
      new FakeGateway({
        ...baseResult,
        operation: "validate",
        outcome: "validation_failed",
        messages: [
          {
            severity: "error",
            code: "ERIC-1",
            text: "Validation failed",
          },
        ],
      }) as any,
      new FakeObjectStorage() as any,
      new FakeDocumentRepo() as any,
      new FakeFileRepo() as any,
      audit as any,
      outbox as any
    );

    await handler.handle({
      tenantId: "workspace-1",
      payload: {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        filingId: "filing-1",
        reportId: "report-1",
        jobId: "job-1",
      },
    } as any);

    expect(jobRepo.failedCalls).toHaveLength(1);
    expect(jobRepo.failedCalls[0]?.status).toBe("validation_failed");
    expect(reportRepo.submitCalls).toHaveLength(0);
  });

  it("marks technical failures on gateway transport errors", async () => {
    const jobRepo = new FakeTaxEricJobRepo();
    const handler = new TaxReportEricJobRequestedHandler(
      jobRepo as any,
      new FakeTaxReportRepo() as any,
      new FakeGateway(
        new ExternalServiceError("gateway unavailable", {
          code: "Tax:ElsterGatewayRequestFailed",
          retryable: true,
        })
      ) as any,
      new FakeObjectStorage() as any,
      new FakeDocumentRepo() as any,
      new FakeFileRepo() as any,
      audit as any,
      outbox as any
    );

    await handler.handle({
      tenantId: "workspace-1",
      payload: {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        filingId: "filing-1",
        reportId: "report-1",
        jobId: "job-1",
      },
    } as any);

    expect(jobRepo.failedCalls).toHaveLength(1);
    expect(jobRepo.failedCalls[0]?.status).toBe("technical_failed");
  });
});
