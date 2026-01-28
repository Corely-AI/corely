import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  RequireTenant,
} from "@corely/kernel";
import type { SetupStatusOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapSettingsToDto } from "../mappers/accounting.mapper";

@RequireTenant()
export class GetSetupStatusUseCase extends BaseUseCase<void, SetupStatusOutput> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<SetupStatusOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const settings = await this.deps.settingsRepo.findByTenant(tenantId);

    return ok({
      isSetup: !!settings,
      settings: settings ? mapSettingsToDto(settings) : null,
    });
  }
}
