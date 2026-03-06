import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@corely/kernel";
import { CreateIncomeTaxDraftUseCase } from "../create-income-tax-draft.use-case";

describe("CreateIncomeTaxDraftUseCase", () => {
  it("creates a draft for PERSONAL strategy in DE", async () => {
    const upsertByPeriod = vi.fn().mockResolvedValue({
      id: "draft-1",
      tenantId: "workspace-1",
      type: "INCOME_TAX",
      group: "ANNUAL_REPORT",
      periodLabel: "2025",
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-12-31T23:59:59.999Z"),
      dueDate: new Date("2026-07-31T23:59:59.999Z"),
      status: "OPEN",
      amountEstimatedCents: null,
      amountFinalCents: null,
      currency: "EUR",
      submittedAt: null,
      submissionReference: null,
      submissionNotes: null,
      archivedReason: null,
      pdfStorageKey: null,
      pdfGeneratedAt: null,
      meta: null,
      lines: [],
      createdAt: new Date("2026-03-04T00:00:00.000Z"),
      updatedAt: new Date("2026-03-04T00:00:00.000Z"),
    });

    const updateMeta = vi.fn().mockResolvedValue({
      id: "draft-1",
      tenantId: "workspace-1",
      type: "INCOME_TAX",
      group: "ANNUAL_REPORT",
      periodLabel: "2025",
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-12-31T23:59:59.999Z"),
      dueDate: new Date("2026-07-31T23:59:59.999Z"),
      status: "OPEN",
      amountEstimatedCents: null,
      amountFinalCents: null,
      currency: "EUR",
      submittedAt: null,
      submissionReference: null,
      submissionNotes: null,
      archivedReason: null,
      pdfStorageKey: null,
      pdfGeneratedAt: null,
      createdAt: new Date("2026-03-04T00:00:00.000Z"),
      updatedAt: new Date("2026-03-04T00:00:01.000Z"),
      meta: {},
      lines: [],
    });

    const useCase = new CreateIncomeTaxDraftUseCase(
      {
        upsertByPeriod,
        updateMeta,
      } as never,
      {
        assertSupported: vi.fn().mockResolvedValue({
          jurisdiction: "DE",
          strategy: "PERSONAL",
          pack: { buildEurStatement: vi.fn() },
        }),
      } as never
    );

    const result = await useCase.execute(
      { year: 2025 },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.value.draftId).toBe("draft-1");
    expect(result.value.year).toBe(2025);
    expect(result.value.nextRequiredActions.length).toBeGreaterThan(0);
    expect(upsertByPeriod).toHaveBeenCalledTimes(1);
    expect(updateMeta).toHaveBeenCalledTimes(1);
  });

  it("returns unsupported for COMPANY strategy", async () => {
    const useCase = new CreateIncomeTaxDraftUseCase(
      {
        upsertByPeriod: vi.fn(),
        updateMeta: vi.fn(),
      } as never,
      {
        assertSupported: vi
          .fn()
          .mockRejectedValue(
            new ValidationError(
              "Income tax draft is currently supported for personal workspaces only.",
              undefined,
              "Tax:IncomeTaxDraftNotSupportedForStrategy"
            )
          ),
      } as never
    );

    const result = await useCase.execute(
      { year: 2025 },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.code).toBe("Tax:IncomeTaxDraftNotSupportedForStrategy");
    }
  });
});
