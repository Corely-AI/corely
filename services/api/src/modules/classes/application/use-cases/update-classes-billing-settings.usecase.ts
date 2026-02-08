import { RequireTenant, type UseCaseContext } from "@corely/kernel";
import type { UpdateClassesBillingSettingsInput } from "@corely/contracts";
import { assertCanClasses } from "../../policies/assert-can-classes";
import { resolveTenantScope } from "../helpers/resolve-scope";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import {
  DEFAULT_PREPAID_SETTINGS,
  defaultBasisForStrategy,
  normalizeBillingSettings,
  validateBillingSettings,
} from "../helpers/billing-settings";
import type { ClassesBillingSettings } from "../../domain/entities/classes.entities";

@RequireTenant()
export class UpdateClassesBillingSettingsUseCase {
  constructor(private readonly settingsRepo: ClassesSettingsRepositoryPort) {}

  async execute(
    input: UpdateClassesBillingSettingsInput,
    ctx: UseCaseContext
  ): Promise<{ settings: ClassesBillingSettings }> {
    assertCanClasses(ctx, "classes.billing");
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    const current = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );

    const nextStrategy = input.billingMonthStrategy ?? current.billingMonthStrategy;
    const nextBasis =
      input.billingBasis ??
      (input.billingMonthStrategy ? defaultBasisForStrategy(nextStrategy) : current.billingBasis);
    const nextAttendanceMode = input.attendanceMode ?? current.attendanceMode;

    const next: ClassesBillingSettings = {
      billingMonthStrategy: nextStrategy,
      billingBasis: nextBasis,
      attendanceMode: nextAttendanceMode,
    };

    validateBillingSettings(next);
    await this.settingsRepo.saveSettings(tenantId, workspaceId, next);

    return { settings: next };
  }
}
