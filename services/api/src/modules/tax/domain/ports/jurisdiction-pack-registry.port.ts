import { TaxJurisdictionUnsupportedError } from "@corely/domain";
import type { JurisdictionPack } from "./jurisdiction-pack.port";

/**
 * Application port for looking up jurisdiction-specific tax packs.
 *
 * Implement this as an adapter in infrastructure/ and register in TaxModule.
 * The abstract class pattern allows NestJS DI token injection.
 *
 * @example
 * ```ts
 * const pack = registry.resolvePack({ jurisdiction: 'DE' });
 * const breakdown = await pack.applyRules(params);
 * snapshot.packId = pack.packId; // store for reproducibility
 * ```
 */
export abstract class JurisdictionPackRegistryPort {
  /**
   * Resolve the appropriate pack for a jurisdiction.
   *
   * @param opts.jurisdiction - ISO 2-letter country code (e.g., "DE")
   * @param opts.packId - Optional specific pack version; if omitted, latest is returned.
   * @throws {TaxJurisdictionUnsupportedError} when no pack exists for the jurisdiction.
   */
  abstract resolvePack(opts: { jurisdiction: string; packId?: string }): JurisdictionPack;

  /**
   * List all registered pack IDs (jurisdiction + version).
   */
  abstract listRegisteredPacks(): ReadonlyArray<{ jurisdiction: string; packId: string }>;
}

/**
 * In-memory registry implementation.
 * Adapters register packs at startup; this is used as the concrete DI provider.
 */
export class InMemoryJurisdictionPackRegistry implements JurisdictionPackRegistryPort {
  private readonly packs = new Map<string, JurisdictionPack>();
  private readonly latestByJurisdiction = new Map<string, JurisdictionPack>();

  register(pack: JurisdictionPack): void {
    this.packs.set(pack.packId, pack);
    // Last registered wins for a given jurisdiction (register in version order)
    this.latestByJurisdiction.set(pack.code, pack);
  }

  resolvePack(opts: { jurisdiction: string; packId?: string }): JurisdictionPack {
    if (opts.packId) {
      const pack = this.packs.get(opts.packId);
      if (!pack) {
        throw new TaxJurisdictionUnsupportedError(`${opts.jurisdiction}@${opts.packId}`);
      }
      return pack;
    }

    const latest = this.latestByJurisdiction.get(opts.jurisdiction);
    if (!latest) {
      throw new TaxJurisdictionUnsupportedError(opts.jurisdiction);
    }
    return latest;
  }

  listRegisteredPacks(): ReadonlyArray<{ jurisdiction: string; packId: string }> {
    return Array.from(this.packs.values()).map((p) => ({
      jurisdiction: p.code,
      packId: p.packId,
    }));
  }
}
