import { Injectable } from "@nestjs/common";
import type { UpsertTaxProfileInput } from "@corely/contracts";
import type { TaxProfileEntity } from "../../domain/entities";
import { TaxProfileRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class UpsertTaxProfileUseCase {
  constructor(private readonly repo: TaxProfileRepoPort) {}

  async execute(input: UpsertTaxProfileInput, ctx: UseCaseContext): Promise<TaxProfileEntity> {
    const effectiveFrom = new Date(input.effectiveFrom);
    const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;

    const profile: Omit<TaxProfileEntity, "id" | "createdAt" | "updatedAt"> = {
      tenantId: ctx.workspaceId,
      country: input.country,
      regime: input.regime,
      vatEnabled: input.vatEnabled ?? true,
      vatId: input.vatId || null,
      currency: input.currency,
      filingFrequency: input.filingFrequency,
      vatAccountingMethod: input.vatAccountingMethod ?? "IST",
      taxYearStartMonth: input.taxYearStartMonth ?? null,
      localTaxOfficeName: input.localTaxOfficeName ?? null,
      vatExemptionParagraph: input.vatExemptionParagraph ?? null,
      euB2BSales: input.euB2BSales ?? false,
      hasEmployees: input.hasEmployees ?? false,
      usesTaxAdvisor: input.usesTaxAdvisor ?? false,
      effectiveFrom,
      effectiveTo,
    };

    return this.repo.upsert(profile);
  }
}
