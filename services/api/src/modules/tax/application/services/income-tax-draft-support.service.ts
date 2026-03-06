import { Injectable } from "@nestjs/common";
import { ValidationError } from "@corely/kernel";
import { TaxStrategyResolverService } from "./tax-strategy-resolver.service";
import { TaxProfileRepoPort, JurisdictionPackRegistryPort } from "../../domain/ports";
import type { JurisdictionPack } from "../../domain/ports/jurisdiction-pack.port";

type JurisdictionPackWithEur = JurisdictionPack & {
  buildEurStatement: NonNullable<JurisdictionPack["buildEurStatement"]>;
};

const hasEurBuilder = (pack: JurisdictionPack): pack is JurisdictionPackWithEur =>
  typeof pack.buildEurStatement === "function";

@Injectable()
export class IncomeTaxDraftSupportService {
  constructor(
    private readonly strategyResolver: TaxStrategyResolverService,
    private readonly profileRepo: TaxProfileRepoPort,
    private readonly packRegistry: JurisdictionPackRegistryPort
  ) {}

  async assertSupported(params: {
    workspaceId: string;
    year: number;
  }): Promise<{ jurisdiction: "DE"; strategy: "PERSONAL"; pack: JurisdictionPackWithEur }> {
    const strategy = await this.strategyResolver.resolve(params.workspaceId);
    if (strategy.strategyId !== "PERSONAL") {
      throw new ValidationError(
        "Income tax draft is currently supported for personal workspaces only.",
        undefined,
        "Tax:IncomeTaxDraftNotSupportedForStrategy"
      );
    }

    const profileAt = new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999));
    const profile = await this.profileRepo.getActive(params.workspaceId, profileAt);
    const jurisdiction = (profile?.country ?? "").toUpperCase();
    if (jurisdiction !== "DE") {
      throw new ValidationError(
        "Income tax draft is currently available only for DE jurisdiction.",
        undefined,
        "Tax:JurisdictionUnsupported"
      );
    }

    let pack: JurisdictionPack;
    try {
      pack = this.packRegistry.resolvePack({ jurisdiction: "DE" });
    } catch {
      throw new ValidationError(
        "Income tax draft is currently available only for DE jurisdiction.",
        undefined,
        "Tax:JurisdictionUnsupported"
      );
    }

    if (!hasEurBuilder(pack)) {
      throw new ValidationError(
        "EÜR mapping is not available for this jurisdiction pack.",
        undefined,
        "Tax:EurMappingUnavailable"
      );
    }

    return {
      jurisdiction: "DE",
      strategy: "PERSONAL",
      pack,
    };
  }
}
