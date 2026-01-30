import { describe, it, expect, beforeEach } from "vitest";
import { GetVatFilingPeriodsUseCase } from "./get-vat-filing-periods.use-case";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { TaxReportRepoPort, TaxProfileRepoPort } from "../../domain/ports";
import { mock } from "vitest-mock-extended";
import { TaxProfileEntity } from "../../domain/entities";
import { isErr } from "@corely/kernel";

describe("GetVatFilingPeriodsUseCase", () => {
  let useCase: GetVatFilingPeriodsUseCase;
  let periodResolver: VatPeriodResolver;
  let taxReportRepo: ReturnType<typeof mock<TaxReportRepoPort>>;
  let taxProfileRepo: ReturnType<typeof mock<TaxProfileRepoPort>>;

  beforeEach(() => {
    periodResolver = new VatPeriodResolver();
    taxReportRepo = mock<TaxReportRepoPort>();
    taxProfileRepo = mock<TaxProfileRepoPort>();
    useCase = new GetVatFilingPeriodsUseCase(periodResolver, taxReportRepo, taxProfileRepo);
  });

  it("should return quarterly periods by default", async () => {
    // Arrange
    const workspaceId = "ws-1";
    const year = 2025;

    taxProfileRepo.getActive.mockResolvedValue({
      filingFrequency: "quarterly",
    } as TaxProfileEntity);

    taxReportRepo.listByPeriodRange.mockResolvedValue([]);

    // Act
    const result = await useCase.execute(
      { year, entityId: workspaceId },
      { tenantId: "t-1", workspaceId }
    );

    // Assert
    if (isErr(result)) {
      throw result.error;
    }
    expect(result.value.periods).toHaveLength(4);
    expect(result.value.periods[0].periodKey).toBe("2025-Q1");
    expect(result.value.periods[3].periodKey).toBe("2025-Q4");
  });

  it("should mark periods as submitted if report exists", async () => {
    // Arrange
    const workspaceId = "ws-1";
    const year = 2025;

    taxProfileRepo.getActive.mockResolvedValue({
      filingFrequency: "quarterly",
    } as TaxProfileEntity);

    taxReportRepo.listByPeriodRange.mockResolvedValue([
      {
        id: "rep-1",
        periodStart: new Date("2025-01-01"),
        periodLabel: "Q1 2025",
        status: "SUBMITTED",
      } as any,
    ]);

    // Act
    const result = await useCase.execute(
      { year, entityId: workspaceId },
      { tenantId: "t-1", workspaceId }
    );

    // Assert
    if (isErr(result)) {
      throw result.error;
    }
    const q1 = result.value.periods.find((p) => p.periodKey === "2025-Q1");
    expect(q1).toBeDefined();
    expect(q1?.status).toBe("SUBMITTED");
    expect(q1?.filingId).toBe("rep-1");
  });
});
