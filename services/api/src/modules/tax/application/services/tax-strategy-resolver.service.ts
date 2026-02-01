import { Injectable, Inject } from "@nestjs/common";
import { PersonalTaxStrategy } from "./personal-tax-strategy";
import { CompanyTaxStrategy } from "./company-tax-strategy";
import { TaxComputationStrategy } from "./tax-strategy";
import {
  WORKSPACE_TAX_SETTINGS_PORT,
  type WorkspaceTaxSettingsPort,
} from "../ports/workspace-tax-settings.port";

@Injectable()
export class TaxStrategyResolverService {
  constructor(
    @Inject(WORKSPACE_TAX_SETTINGS_PORT)
    private readonly settingsRepo: WorkspaceTaxSettingsPort,
    private readonly personal: PersonalTaxStrategy,
    private readonly company: CompanyTaxStrategy
  ) {}

  async resolve(workspaceId: string): Promise<TaxComputationStrategy> {
    const kind = await this.settingsRepo.getLegalEntityKind(workspaceId);
    return kind === "COMPANY" ? this.company : this.personal;
  }
}
