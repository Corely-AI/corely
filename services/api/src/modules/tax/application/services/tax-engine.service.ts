import { Injectable } from "@nestjs/common";
import type { CalculateTaxInput, TaxBreakdownDto } from "@corely/contracts";
import { TaxProfileMissingError } from "@corely/domain";
import { ValidationError } from "@corely/kernel";
import { TaxProfileRepoPort } from "../../domain/ports";
import { TaxProfile } from "../../domain/entities";
import { JurisdictionPackRegistryPort } from "../../domain/ports/jurisdiction-pack-registry.port";

/**
 * Tax Engine Service
 *
 * Orchestrates tax calculations using the JurisdictionPackRegistry.
 * Does NOT hardcode any jurisdiction — fully decoupled from DE pack.
 */
@Injectable()
export class TaxEngineService {
  constructor(
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly packRegistry: JurisdictionPackRegistryPort
  ) {}

  /**
   * Calculate tax breakdown for a document (invoice/expense draft).
   *
   * @throws {TaxProfileMissingError} when no active profile exists.
   * @throws {TaxJurisdictionUnsupportedError} when the jurisdiction has no pack.
   */
  async calculate(
    input: CalculateTaxInput,
    tenantId: string,
    options?: { invoiceIssuance: true }
  ): Promise<TaxBreakdownDto & { packId: string }> {
    const documentDate = new Date(input.documentDate);

    // Get active tax profile
    const profile = await this.taxProfileRepo.getActive(tenantId, documentDate);
    if (!profile) {
      throw new TaxProfileMissingError(tenantId);
    }

    if (!TaxProfile.canCalculate(profile, documentDate)) {
      throw new TaxProfileMissingError(tenantId);
    }

    // Resolve jurisdiction pack (throws TaxJurisdictionUnsupportedError if not found)
    const jurisdiction = input.jurisdiction || profile.country;
    const pack = this.packRegistry.resolvePack({ jurisdiction });

    if (options?.invoiceIssuance) {
      if (jurisdiction !== profile.country || input.currency !== profile.currency) {
        throw new ValidationError(
          "Invoice issuer country and currency must match the active tax profile."
        );
      }
      if (
        profile.regime === "VAT_EXEMPT" ||
        (profile.regime === "STANDARD_VAT" && !profile.vatEnabled)
      ) {
        throw new ValidationError(
          "The configured VAT treatment is unsupported for invoice issuance."
        );
      }
      if (input.customer && input.customer.country !== jurisdiction) {
        throw new ValidationError("Cross-border invoice tax treatment requires specialist review.");
      }
    }

    // Apply rules
    const breakdown = await pack.applyRules({
      regime: profile.regime,
      documentDate,
      currency: input.currency || profile.currency,
      customer: input.customer,
      lines: input.lines,
      tenantId,
    });

    if (
      options?.invoiceIssuance &&
      profile.regime === "STANDARD_VAT" &&
      breakdown.lines.some((line) => line.kind === "STANDARD" && line.rateBps <= 0)
    ) {
      throw new ValidationError("An effective standard VAT rate is required for this invoice.");
    }
    return { ...breakdown, packId: pack.packId };
  }

  /**
   * List all supported jurisdiction codes.
   */
  getSupportedJurisdictions(): string[] {
    return this.packRegistry
      .listRegisteredPacks()
      .map((p) => p.jurisdiction)
      .filter((v, i, arr) => arr.indexOf(v) === i); // unique
  }
}
