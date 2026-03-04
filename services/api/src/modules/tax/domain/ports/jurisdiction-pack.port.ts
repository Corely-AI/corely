import type {
  TaxCodeKind,
  TaxLineInput,
  CustomerTaxInfo,
  TaxBreakdownDto,
  TaxRegime,
  TaxEurStatementDto,
} from "@corely/contracts";

/**
 * Parameters for applying jurisdiction-specific tax rules
 */
export interface ApplyRulesParams {
  regime: TaxRegime;
  documentDate: Date;
  currency: string;
  customer: CustomerTaxInfo | null | undefined;
  lines: TaxLineInput[];
  tenantId: string;
}

export interface BuildEurStatementParams {
  year: number;
  currency: string;
  basis: "cash";
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  generatedAt: Date;
}

/**
 * A jurisdiction-specific tax calculation pack.
 *
 * Each pack implements tax rules for a specific country/region and version.
 * The packId is included in TaxSnapshot records for reproducibility.
 */
export interface JurisdictionPack {
  /** ISO 2-letter country/region code: "DE", "AT", etc. */
  readonly code: string;

  /** Stable version identifier embedded in snapshots: "de-v1", "at-v1", etc. */
  readonly packId: string;

  /**
   * Get rate in basis points for a tax code kind or ID at a specific date.
   * Returns 0 for EXEMPT, ZERO, REVERSE_CHARGE.
   */
  getRateBps(taxCodeKindOrId: string, documentDate: Date, tenantId: string): Promise<number>;

  /**
   * Apply jurisdiction-specific rules and calculate tax breakdown.
   */
  applyRules(params: ApplyRulesParams): Promise<TaxBreakdownDto>;

  /**
   * Optional: infer tax code kind from customer/line data.
   * Used by future smart auto-classification features.
   */
  inferKindOrCode?(customer: CustomerTaxInfo | null, lineData: unknown): TaxCodeKind | null;

  /**
   * Optional: map annual income/expense totals into a jurisdiction-specific EÜR statement.
   */
  buildEurStatement?(params: BuildEurStatementParams): TaxEurStatementDto;
}
