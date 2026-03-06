import { Injectable } from "@nestjs/common";
import type { CalculateTaxInput, TaxBreakdownDto } from "@corely/contracts";
import { TaxProfileMissingError } from "@corely/domain";
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
    tenantId: string
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

    // Apply rules
    const breakdown = await pack.applyRules({
      regime: profile.regime,
      documentDate,
      currency: input.currency || profile.currency,
      customer: input.customer,
      lines: input.lines,
      tenantId,
    });

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
