import { describe, expect, it, vi } from "vitest";
import type { TaxEurStatementDto } from "@corely/contracts";
import { GetEurStatementUseCase } from "../get-eur-statement.use-case";
import { TaxProfileRepoPort } from "../../../domain/ports";
import { JurisdictionPackRegistryPort } from "../../../domain/ports/jurisdiction-pack-registry.port";
import { TaxEurSourcePort } from "../../ports/tax-eur-source.port";
import type {
  ApplyRulesParams,
  BuildEurStatementParams,
  JurisdictionPack,
} from "../../../domain/ports/jurisdiction-pack.port";

class FakeTaxProfileRepo extends TaxProfileRepoPort {
  async getActive(_tenantId: string, _at: Date) {
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
      effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
      effectiveTo: null,
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    };
  }

  async upsert(_profile: Parameters<TaxProfileRepoPort["upsert"]>[0]) {
    throw new Error("Not implemented");
  }

  async findById(_id: string, _tenantId: string) {
    return null;
  }
}

class FakeEurSource extends TaxEurSourcePort {
  async getEurTotals(_input: { workspaceId: string; year: number; basis: "cash" }) {
    return {
      currency: "EUR",
      incomeByCategory: {
        "income.sales": 10_000,
      },
      expenseByCategory: {
        "expense.other": 2_000,
      },
    };
  }
}

class FakeEurPack implements JurisdictionPack {
  readonly code = "DE";
  readonly packId = "de-v1";

  async getRateBps(
    _taxCodeKindOrId: string,
    _documentDate: Date,
    _tenantId: string
  ): Promise<number> {
    return 0;
  }

  async applyRules(_params: ApplyRulesParams) {
    throw new Error("Not implemented");
  }

  buildEurStatement(params: BuildEurStatementParams): TaxEurStatementDto {
    return {
      year: params.year,
      currency: params.currency,
      jurisdiction: "DE",
      basis: "cash",
      lines: [],
      totals: {
        incomeCents: 10_000,
        expenseCents: 2_000,
        profitCents: 8_000,
      },
      generatedAt: params.generatedAt.toISOString(),
    };
  }
}

class FakePackRegistry extends JurisdictionPackRegistryPort {
  constructor(private readonly pack: JurisdictionPack) {
    super();
  }

  resolvePack(_opts: { jurisdiction: string; packId?: string }): JurisdictionPack {
    return this.pack;
  }

  listRegisteredPacks(): ReadonlyArray<{ jurisdiction: string; packId: string }> {
    return [{ jurisdiction: "DE", packId: "de-v1" }];
  }
}

describe("GetEurStatementUseCase", () => {
  it("rejects COMPANY strategy with a clear unsupported error", async () => {
    const useCase = new GetEurStatementUseCase(
      {
        resolve: vi.fn().mockResolvedValue({ strategyId: "COMPANY" }),
      } as never,
      new FakeTaxProfileRepo(),
      new FakePackRegistry(new FakeEurPack()),
      new FakeEurSource()
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
      expect(result.error.code).toBe("Tax:EurNotSupportedForStrategy");
    }
  });

  it("returns statement for PERSONAL strategy in DE", async () => {
    const useCase = new GetEurStatementUseCase(
      {
        resolve: vi.fn().mockResolvedValue({ strategyId: "PERSONAL" }),
      } as never,
      new FakeTaxProfileRepo(),
      new FakePackRegistry(new FakeEurPack()),
      new FakeEurSource()
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
    expect(result.value.statement.year).toBe(2025);
    expect(result.value.statement.totals.profitCents).toBe(8_000);
  });
});
