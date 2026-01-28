import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { UpdateSalesSettingsInput, UpdateSalesSettingsOutput } from "@corely/contracts";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { SettingsDeps } from "./sales-settings.deps";

@RequireTenant()
export class UpdateSalesSettingsUseCase extends BaseUseCase<
  UpdateSalesSettingsInput,
  UpdateSalesSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateSalesSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateSalesSettingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<UpdateSalesSettingsOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.update-settings",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const now = this.services.clock.now();
    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now,
      });
    }

    settings.updateSettings(input.patch, now);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.settings.updated",
      entityType: "SalesSettings",
      entityId: settings.id,
    });

    const result = { settings: toSettingsDto(settings) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.update-settings",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
