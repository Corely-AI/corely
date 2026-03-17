import { Injectable } from "@nestjs/common";
import { type TaxCodeEntity } from "../../domain/entities";
import { TaxCodeRepoPort, TaxProfileRepoPort, TaxRateRepoPort } from "../../domain/ports";
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
export class ListTaxCodesUseCase extends BaseUseCase<void, TaxCodeEntity[]> {
  constructor(
    private readonly repo: TaxCodeRepoPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxRateRepo: TaxRateRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<TaxCodeEntity[], UseCaseError>> {
    const scopeId = ctx.workspaceId || ctx.tenantId!;
    let codes = await this.repo.findAll(scopeId);
    if (codes.length === 0) {
      const profile = await this.taxProfileRepo.getActive(scopeId, new Date());
      if (profile?.country === "DE" && profile.regime === "STANDARD_VAT") {
        const effectiveFrom = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
        const standard = await this.repo.create({
          tenantId: scopeId,
          code: "DE_STD_19",
          kind: "STANDARD",
          label: "USt 19%",
          isActive: true,
        });
        const reduced = await this.repo.create({
          tenantId: scopeId,
          code: "DE_RED_7",
          kind: "REDUCED",
          label: "USt 7%",
          isActive: true,
        });
        await this.repo.create({
          tenantId: scopeId,
          code: "DE_EXEMPT",
          kind: "EXEMPT",
          label: "Steuerfrei",
          isActive: true,
        });
        await this.taxRateRepo.create({
          tenantId: scopeId,
          taxCodeId: standard.id,
          rateBps: 1900,
          effectiveFrom,
          effectiveTo: null,
        });
        await this.taxRateRepo.create({
          tenantId: scopeId,
          taxCodeId: reduced.id,
          rateBps: 700,
          effectiveFrom,
          effectiveTo: null,
        });
        codes = await this.repo.findAll(scopeId);
      }
    }
    return ok(codes);
  }
}
