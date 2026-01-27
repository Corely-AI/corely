import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
} from "@corely/kernel";
import type {
  UpdateAccountingSettingsInput,
  UpdateAccountingSettingsOutput,
} from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapSettingsToDto } from "../mappers/accounting.mapper";

export class UpdateAccountingSettingsUseCase extends BaseUseCase<
  UpdateAccountingSettingsInput,
  UpdateAccountingSettingsOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateAccountingSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateAccountingSettingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting settings not found"));
    }

    const now = this.deps.clock.now();
    settings.updateSettings({
      periodLockingEnabled: input.periodLockingEnabled,
      entryNumberPrefix: input.entryNumberPrefix,
      now,
    });

    await this.deps.settingsRepo.save(settings);

    return ok({ settings: mapSettingsToDto(settings) });
  }
}
