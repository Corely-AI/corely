import { Injectable } from "@nestjs/common";
import { type UpsertTaxProfileInput } from "@corely/contracts";
import { type TaxProfileEntity } from "../../domain/entities";
import { TaxProfileRepoPort } from "../../domain/ports";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class UpsertTaxProfileUseCase extends BaseUseCase<UpsertTaxProfileInput, TaxProfileEntity> {
  constructor(private readonly repo: TaxProfileRepoPort) {
    super({ logger: null as any });
  }

  protected async handle(
    input: UpsertTaxProfileInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxProfileEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    const saved = await this.repo.upsert({
      tenantId: workspaceId,
      country: input.country,
      regime: input.regime,
      vatEnabled: input.vatEnabled,
      vatId: input.vatId || null,
      currency: input.currency,
      filingFrequency: input.filingFrequency,
      vatAccountingMethod: input.vatAccountingMethod,
      taxYearStartMonth: input.taxYearStartMonth,
      localTaxOfficeName: input.localTaxOfficeName,
      vatExemptionParagraph: input.vatExemptionParagraph || null,
      euB2BSales: input.euB2BSales ?? false,
      hasEmployees: input.hasEmployees ?? false,
      usesTaxAdvisor: input.usesTaxAdvisor ?? false,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
    });

    return ok(saved);
  }
}
