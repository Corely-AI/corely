import { Injectable } from "@nestjs/common";
import type {
  TaxBreakdownDto,
  TaxCodeKind,
  TaxTotalsByKind,
  TaxLineResultDto,
} from "@corely/contracts";
import type {
  JurisdictionPack,
  ApplyRulesParams,
} from "../../../../domain/ports/jurisdiction-pack.port";
import { TaxCodeRepoPort, TaxRateRepoPort } from "../../../../domain/ports";
import { TaxCode } from "../../../../domain/entities";
import { RoundingPolicy } from "../../../../application/services/rounding.policy";

/**
 * Germany (DE) Tax Pack - v1 Adapter
 *
 * Implements German VAT rules:
 * - SMALL_BUSINESS (§19 UStG): no VAT charged on any output
 * - STANDARD_VAT: per-line VAT calculation with standard (19%) and reduced (7%) DE rates
 * - Reverse charge support for cross-border B2B
 *
 * packId: "de-v1" — stored in TaxSnapshot.packId for reproducibility.
 */
@Injectable()
export class DEPackV1Adapter implements JurisdictionPack {
  readonly code = "DE";
  readonly packId = "de-v1";

  constructor(
    private readonly taxCodeRepo: TaxCodeRepoPort,
    private readonly taxRateRepo: TaxRateRepoPort
  ) {}

  /**
   * Get rate in basis points for a tax code kind or custom code ID.
   * Returns 0 for zero-tax kinds.
   */
  async getRateBps(taxCodeKindOrId: string, documentDate: Date, tenantId: string): Promise<number> {
    const validKinds: string[] = ["STANDARD", "REDUCED", "REVERSE_CHARGE", "EXEMPT", "ZERO"];
    const isKind = validKinds.includes(taxCodeKindOrId);

    if (!isKind) {
      // Treat as a custom tax code ID
      const effectiveRate = await this.taxRateRepo.findEffectiveRate(
        taxCodeKindOrId,
        tenantId,
        documentDate
      );
      return effectiveRate?.rateBps ?? 0;
    }

    const kind = taxCodeKindOrId as TaxCodeKind;

    // Zero-tax kinds always return 0
    if (TaxCode.isZeroTax(kind)) {
      return 0;
    }

    // Look up tenant's custom codes for STANDARD/REDUCED
    const codes = await this.taxCodeRepo.findByKind(kind, tenantId);
    if (codes.length === 0) {
      // No tenant code — fall back to German statutory defaults
      if (kind === "STANDARD") {
        return 1900;
      } // 19%
      if (kind === "REDUCED") {
        return 700;
      } // 7%
      return 0;
    }

    const activeCode = codes.find((c) => c.isActive) ?? codes[0];
    const effectiveRate = await this.taxRateRepo.findEffectiveRate(
      activeCode.id,
      tenantId,
      documentDate
    );
    return effectiveRate?.rateBps ?? 0;
  }

  /**
   * Apply German VAT rules and return a full tax breakdown.
   */
  async applyRules(params: ApplyRulesParams): Promise<TaxBreakdownDto> {
    const { regime, documentDate, currency, customer, lines, tenantId } = params;

    // §19 UStG - Small business: no VAT output
    if (regime === "SMALL_BUSINESS") {
      return this.applySmallBusinessRules(lines, currency);
    }

    // Standard and VAT-exempt regimes use per-line VAT logic
    return this.applyStandardVat(lines, documentDate, tenantId, currency, customer);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Small business regime (§19 UStG) — no VAT charged on any line.
   */
  private applySmallBusinessRules(
    lines: ApplyRulesParams["lines"],
    currency: string
  ): TaxBreakdownDto {
    const lineResults: TaxLineResultDto[] = lines.map((line) => ({
      lineId: line.id ?? null,
      taxCodeId: null,
      kind: "EXEMPT" as TaxCodeKind,
      rateBps: 0,
      netAmountCents: line.netAmountCents,
      taxAmountCents: 0,
      grossAmountCents: line.netAmountCents,
    }));

    const subtotalAmountCents = lines.reduce((sum, line) => sum + line.netAmountCents, 0);

    return {
      subtotalAmountCents,
      taxTotalAmountCents: 0,
      totalAmountCents: subtotalAmountCents,
      roundingMode: "PER_LINE",
      lines: lineResults,
      totalsByKind: {
        EXEMPT: {
          netAmountCents: subtotalAmountCents,
          taxAmountCents: 0,
          grossAmountCents: subtotalAmountCents,
        },
      },
      flags: {
        needsReverseChargeNote: false,
        isSmallBusinessNoVatCharged: true,
      },
    };
  }

  /**
   * Standard VAT regime — per-line calculation.
   */
  private async applyStandardVat(
    lines: ApplyRulesParams["lines"],
    documentDate: Date,
    tenantId: string,
    currency: string,
    customer: ApplyRulesParams["customer"]
  ): Promise<TaxBreakdownDto> {
    const lineResults: TaxLineResultDto[] = [];
    let needsReverseChargeNote = false;

    for (const line of lines) {
      const taxCodeId = line.taxCodeId ?? null;
      let kind: TaxCodeKind = "STANDARD"; // default
      let rateBps = 0;

      if (taxCodeId) {
        const taxCode = await this.taxCodeRepo.findById(taxCodeId, tenantId);
        if (taxCode) {
          kind = taxCode.kind;
          if (TaxCode.requiresRate(kind)) {
            rateBps = await this.getRateBps(taxCodeId, documentDate, tenantId);
          } else if (TaxCode.needsReverseChargeNote(kind)) {
            needsReverseChargeNote = true;
          }
        }
      } else {
        // No tax code — default to tenant's STANDARD rate (or DE fallback 19%)
        rateBps = await this.getRateBps("STANDARD", documentDate, tenantId);
      }

      const taxAmountCents = RoundingPolicy.calculateTaxCents(line.netAmountCents, rateBps);
      const grossAmountCents = line.netAmountCents + taxAmountCents;

      lineResults.push({
        lineId: line.id ?? null,
        taxCodeId,
        kind,
        rateBps,
        netAmountCents: line.netAmountCents,
        taxAmountCents,
        grossAmountCents,
      });
    }

    // Aggregate totals by kind
    const totalsByKind: TaxTotalsByKind = {};
    for (const line of lineResults) {
      const bucket =
        totalsByKind[line.kind] ??
        (totalsByKind[line.kind] = {
          netAmountCents: 0,
          taxAmountCents: 0,
          grossAmountCents: 0,
          rateBps: line.rateBps,
        });
      bucket.netAmountCents += line.netAmountCents;
      bucket.taxAmountCents += line.taxAmountCents;
      bucket.grossAmountCents += line.grossAmountCents;
    }

    const subtotalAmountCents = lineResults.reduce((sum, l) => sum + l.netAmountCents, 0);
    const taxTotalAmountCents = lineResults.reduce((sum, l) => sum + l.taxAmountCents, 0);

    return {
      subtotalAmountCents,
      taxTotalAmountCents,
      totalAmountCents: subtotalAmountCents + taxTotalAmountCents,
      roundingMode: "PER_LINE",
      lines: lineResults,
      totalsByKind,
      flags: {
        needsReverseChargeNote,
        isSmallBusinessNoVatCharged: false,
      },
    };
  }
}
