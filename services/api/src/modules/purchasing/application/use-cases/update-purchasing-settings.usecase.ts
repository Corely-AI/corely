import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type {
  UpdatePurchasingSettingsInput,
  UpdatePurchasingSettingsOutput,
} from "@corely/contracts";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toSettingsDto } from "../mappers/purchasing-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { SettingsDeps } from "./purchasing-settings.deps";

@RequireTenant()
export class UpdatePurchasingSettingsUseCase extends BaseUseCase<
  UpdatePurchasingSettingsInput,
  UpdatePurchasingSettingsOutput
> {
  constructor(private readonly services: SettingsDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdatePurchasingSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdatePurchasingSettingsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<UpdatePurchasingSettingsOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.update-settings",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now: this.services.clock.now(),
      });
    }

    settings.updateSettings(
      {
        defaultPaymentTerms: input.defaultPaymentTerms,
        defaultCurrency: input.defaultCurrency ?? settings.toProps().defaultCurrency,
        poNumberingPrefix: input.poNumberingPrefix ?? settings.toProps().poNumberingPrefix,
        billInternalRefPrefix:
          input.billInternalRefPrefix ?? settings.toProps().billInternalRefPrefix,
        defaultAccountsPayableAccountId: input.defaultAccountsPayableAccountId,
        defaultExpenseAccountId: input.defaultExpenseAccountId,
        defaultBankAccountId: input.defaultBankAccountId,
        autoPostOnBillPost: input.autoPostOnBillPost ?? settings.toProps().autoPostOnBillPost,
        autoPostOnPaymentRecord:
          input.autoPostOnPaymentRecord ?? settings.toProps().autoPostOnPaymentRecord,
        billDuplicateDetectionEnabled:
          input.billDuplicateDetectionEnabled ?? settings.toProps().billDuplicateDetectionEnabled,
        approvalRequiredForBills:
          input.approvalRequiredForBills ?? settings.toProps().approvalRequiredForBills,
      },
      this.services.clock.now()
    );

    await this.services.settingsRepo.save(settings);

    const result = { settings: toSettingsDto(settings) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.update-settings",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
