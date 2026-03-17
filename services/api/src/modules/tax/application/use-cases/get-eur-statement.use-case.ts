import { Inject, Injectable } from "@nestjs/common";
import type { GetTaxEurStatementOutput, GetTaxEurStatementQuery } from "@corely/contracts";
import {
  BaseUseCase,
  ValidationError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxStrategyResolverService } from "../services/tax-strategy-resolver.service";
import { JurisdictionPackRegistryPort, TaxProfileRepoPort } from "../../domain/ports";
import { TAX_EUR_SOURCE_PORT, type TaxEurSourcePort } from "../ports/tax-eur-source.port";
import type {
  BuildEurStatementParams,
  JurisdictionPack,
} from "../../domain/ports/jurisdiction-pack.port";

type JurisdictionPackWithEur = JurisdictionPack & {
  buildEurStatement: (params: BuildEurStatementParams) => GetTaxEurStatementOutput["statement"];
};

function supportsEur(pack: JurisdictionPack): pack is JurisdictionPackWithEur {
  return typeof pack.buildEurStatement === "function";
}

@RequireTenant()
@Injectable()
export class GetEurStatementUseCase extends BaseUseCase<
  GetTaxEurStatementQuery,
  GetTaxEurStatementOutput
> {
  constructor(
    private readonly strategyResolver: TaxStrategyResolverService,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly packRegistry: JurisdictionPackRegistryPort,
    @Inject(TAX_EUR_SOURCE_PORT) private readonly eurSource: TaxEurSourcePort
  ) {
    super({});
  }

  protected async handle(
    input: GetTaxEurStatementQuery,
    ctx: UseCaseContext
  ): Promise<Result<GetTaxEurStatementOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const strategy = await this.strategyResolver.resolve(workspaceId);

    if (strategy.strategyId !== "PERSONAL") {
      return err(
        new ValidationError(
          "EÜR report is currently supported for personal workspaces only.",
          undefined,
          "Tax:EurNotSupportedForStrategy"
        )
      );
    }

    const profileAt = new Date(Date.UTC(input.year, 11, 31, 23, 59, 59, 999));
    const profile = await this.taxProfileRepo.getActive(workspaceId, profileAt);
    const jurisdiction = (profile?.country ?? "").toUpperCase();
    if (jurisdiction !== "DE") {
      return err(
        new ValidationError(
          "EÜR report is currently available only for DE jurisdiction.",
          undefined,
          "Tax:JurisdictionUnsupported"
        )
      );
    }

    let pack: JurisdictionPack;
    try {
      pack = this.packRegistry.resolvePack({ jurisdiction });
    } catch {
      return err(
        new ValidationError(
          "EÜR report is currently available only for DE jurisdiction.",
          undefined,
          "Tax:JurisdictionUnsupported"
        )
      );
    }

    if (!supportsEur(pack)) {
      return err(
        new ValidationError(
          "EÜR mapping is not available for this jurisdiction pack.",
          undefined,
          "Tax:EurMappingUnavailable"
        )
      );
    }

    const totals = await this.eurSource.getEurTotals({
      workspaceId,
      year: input.year,
      basis: "cash",
    });
    const statement = pack.buildEurStatement({
      year: input.year,
      currency: totals.currency,
      basis: "cash",
      incomeByCategory: totals.incomeByCategory,
      expenseByCategory: totals.expenseByCategory,
      generatedAt: new Date(),
    });

    return ok({ statement });
  }
}
