import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
} from "@corely/kernel";
import type { SetupStatusOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapSettingsToDto } from "../mappers/accounting.mapper";

export class GetSetupStatusUseCase extends BaseUseCase<void, SetupStatusOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<SetupStatusOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);

    return ok({
      isSetup: !!settings,
      settings: settings ? mapSettingsToDto(settings) : null,
    });
  }
}
