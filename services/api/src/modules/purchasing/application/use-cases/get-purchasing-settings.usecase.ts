import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetPurchasingSettingsInput, GetPurchasingSettingsOutput } from "@corely/contracts";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/purchasing-dto.mapper";
import type { SettingsDeps } from "./purchasing-settings.deps";

@RequireTenant()
export class GetPurchasingSettingsUseCase extends BaseUseCase<
  GetPurchasingSettingsInput,
  GetPurchasingSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    _input: GetPurchasingSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPurchasingSettingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now: this.services.clock.now(),
      });
      await this.services.settingsRepo.save(settings);
    }

    return ok({ settings: toSettingsDto(settings) });
  }
}
