import { describe, expect, it } from "vitest";
import {
  TaxElsterGatewayRequestSchema,
  TaxElsterGatewayResultSchema,
} from "../tax/eric-gateway.schema";

describe("TaxElsterGateway schemas", () => {
  it("accepts a normalized UStVA gateway request", () => {
    const parsed = TaxElsterGatewayRequestSchema.safeParse({
      requestId: "req-1",
      jobId: "job-1",
      correlationId: "corr-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      filingId: "filing-1",
      reportId: "report-1",
      reportType: "vat_advance_report",
      declarationType: "de-ustva",
      operation: "validate",
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
          vatCollectedCents: 125000,
          vatPaidCents: 25000,
          netPayableCents: 100000,
          salesNetCents: 500000,
          purchaseNetCents: 125000,
        },
        kennzifferRows: [
          {
            kennziffer: "81",
            label: "Lieferungen zum Steuersatz 19%",
            value: "1000.00",
          },
        ],
      },
      metadata: {
        source: "corely-tax",
        actorUserId: "user-1",
        idempotencyKey: "idem-1",
        requestId: "req-1",
        correlationId: "corr-1",
        requestedAt: "2026-03-11T12:00:00.000Z",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts a validation failure result with structured messages", () => {
    const parsed = TaxElsterGatewayResultSchema.safeParse({
      requestId: "req-1",
      jobId: "job-1",
      correlationId: "corr-1",
      declarationType: "de-ustva",
      gatewayStatus: "completed",
      operation: "validate",
      outcome: "validation_failed",
      retryable: false,
      gatewayVersion: "gateway-1.0.0",
      ericVersion: "eric-41.2.6.0",
      resultCodes: ["ERIC-610101201"],
      messages: [
        {
          severity: "error",
          code: "ERIC-610101201",
          text: "Required field is missing.",
          path: "$.payload.kennzifferRows[0]",
        },
      ],
      artifacts: [],
      rawMetadata: {
        gatewayRequestId: "gw-1",
      },
      startedAt: "2026-03-11T12:00:00.000Z",
      finishedAt: "2026-03-11T12:00:02.000Z",
    });

    expect(parsed.success).toBe(true);
  });
});
