import { Injectable, NotFoundException } from "@nestjs/common";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";
import { VatAccountingMethod } from "@corely/contracts";

@Injectable()
export class GetVatPeriodDetailsUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {}

  async execute(periodKey: string, ctx: UseCaseContext) {
    const period = this.periodResolver.resolveQuarter(periodKey);
    // TODO: Validate period bounds?

    const profile = await this.taxProfileRepo.getActive(ctx.workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    const details = await this.vatPeriodQuery.getDetails(
      ctx.workspaceId,
      period.start,
      period.end,
      method as VatAccountingMethod
    );

    return details;
  }
}
