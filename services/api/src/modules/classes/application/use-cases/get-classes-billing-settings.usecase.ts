import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { resolveTenantScope } from "../helpers/resolve-scope";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import type { ClassesBillingSettings } from "../../domain/entities/classes.entities";

@RequireTenant()
export class GetClassesBillingSettingsUseCase {
  constructor(private readonly settingsRepo: ClassesSettingsRepositoryPort) {}

  async execute(ctx: UseCaseContext): Promise<{ settings: ClassesBillingSettings }> {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const current = await this.settingsRepo.getSettings(tenantId, workspaceId);
    const normalized = normalizeBillingSettings(current ?? DEFAULT_PREPAID_SETTINGS);

    if (
      !current ||
      current.billingMonthStrategy !== normalized.billingMonthStrategy ||
      current.billingBasis !== normalized.billingBasis
    ) {
      await this.settingsRepo.saveSettings(tenantId, workspaceId, normalized);
    }

    return { settings: normalized };
  }
}
