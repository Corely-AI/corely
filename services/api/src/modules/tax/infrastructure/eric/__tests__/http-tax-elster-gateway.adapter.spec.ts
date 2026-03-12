import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalServiceError } from "@corely/kernel";
import { HttpTaxElsterGatewayAdapter } from "../http-tax-elster-gateway.adapter";

const request = {
  requestId: "req-1",
  jobId: "job-1",
  correlationId: "corr-1",
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  filingId: "filing-1",
  reportId: "report-1",
  reportType: "vat_advance_report" as const,
  declarationType: "de-ustva" as const,
  operation: "validate" as const,
  payloadVersion: "de-ustva-v2026.1",
  certificateReferenceId: "cert-1",
  period: {
    taxYear: 2025,
    filingPeriodKey: "2025-01",
    periodStart: "2025-01-01T00:00:00.000Z",
    periodEnd: "2025-01-31T23:59:59.999Z",
  },
  payload: {
    declarationType: "de-ustva" as const,
    payloadVersion: "de-ustva-v2026.1",
    jurisdiction: "DE",
    filingType: "vat" as const,
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
};

describe("HttpTaxElsterGatewayAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns connected only when a base URL exists", () => {
    const adapter = new HttpTaxElsterGatewayAdapter({
      ELSTER_GATEWAY_BASE_URL: "https://gateway.example",
      ELSTER_GATEWAY_API_KEY: undefined,
      ELSTER_GATEWAY_TIMEOUT_MS: 5000,
    } as unknown as ConstructorParameters<typeof HttpTaxElsterGatewayAdapter>[0]);

    expect(adapter.getConnectionStatus()).toBe("connected");
  });

  it("maps successful gateway responses into the internal contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          requestId: "req-1",
          jobId: "job-1",
          correlationId: "corr-1",
          declarationType: "de-ustva",
          gatewayStatus: "completed",
          operation: "validate",
          outcome: "success",
          retryable: false,
          resultCodes: [],
          messages: [],
          artifacts: [],
          rawMetadata: {},
          startedAt: "2026-03-11T12:00:00.000Z",
          finishedAt: "2026-03-11T12:00:01.000Z",
        }),
      })
    );

    const adapter = new HttpTaxElsterGatewayAdapter({
      ELSTER_GATEWAY_BASE_URL: "https://gateway.example",
      ELSTER_GATEWAY_API_KEY: "secret",
      ELSTER_GATEWAY_TIMEOUT_MS: 5000,
    } as unknown as ConstructorParameters<typeof HttpTaxElsterGatewayAdapter>[0]);

    const result = await adapter.execute(request);
    expect(result.outcome).toBe("success");
    expect(result.gatewayStatus).toBe("completed");
  });

  it("turns transport failures into ExternalServiceError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => "gateway unavailable",
      })
    );

    const adapter = new HttpTaxElsterGatewayAdapter({
      ELSTER_GATEWAY_BASE_URL: "https://gateway.example",
      ELSTER_GATEWAY_API_KEY: undefined,
      ELSTER_GATEWAY_TIMEOUT_MS: 5000,
    } as unknown as ConstructorParameters<typeof HttpTaxElsterGatewayAdapter>[0]);

    await expect(adapter.execute(request)).rejects.toBeInstanceOf(ExternalServiceError);
  });
});
