import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetSalesSettingsInput, GetSalesSettingsOutput } from "@corely/contracts";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/sales-dto.mapper";
import type { SettingsDeps } from "./sales-settings.deps";

@RequireTenant()
export class GetSalesSettingsUseCase extends BaseUseCase<
  GetSalesSettingsInput,
  GetSalesSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    _input: GetSalesSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetSalesSettingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      const now = this.services.clock.now();
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now,
      });
      await this.services.settingsRepo.save(settings);
    }

    return ok({ settings: toSettingsDto(settings) });
  }
}
