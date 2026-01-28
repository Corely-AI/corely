import { Injectable } from "@nestjs/common";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatAccountingMethod } from "@corely/contracts";
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
export class GetVatPeriodDetailsUseCase extends BaseUseCase<string, any> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    periodKey: string,
    ctx: UseCaseContext
  ): Promise<Result<any, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId!;
    const period = this.periodResolver.resolveQuarter(periodKey);

    const profile = await this.taxProfileRepo.getActive(workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    const details = await this.vatPeriodQuery.getDetails(
      workspaceId,
      period.start,
      period.end,
      method as VatAccountingMethod
    );

    const salesNetCents = details.sales.reduce((sum, row) => sum + row.netAmountCents, 0);
    const salesVatCents = details.sales.reduce((sum, row) => sum + row.taxAmountCents, 0);
    const salesGrossCents = details.sales.reduce((sum, row) => sum + row.grossAmountCents, 0);

    const purchaseNetCents = details.purchases.reduce((sum, row) => sum + row.netAmountCents, 0);
    const purchaseVatCents = details.purchases.reduce((sum, row) => sum + row.taxAmountCents, 0);
    const purchaseGrossCents = details.purchases.reduce(
      (sum, row) => sum + row.grossAmountCents,
      0
    );

    return ok({
      periodKey: period.key,
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
      currency: profile?.currency ?? "EUR",
      salesNetCents,
      salesVatCents,
      salesGrossCents,
      purchaseNetCents,
      purchaseVatCents,
      purchaseGrossCents,
      taxDueCents: salesVatCents - purchaseVatCents,
      rows: [...details.sales, ...details.purchases].map((row) => ({
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        displayNumber: row.displayNumber,
        customer: row.customer,
        dateUsed: row.dateUsed.toISOString(),
        netAmountCents: row.netAmountCents,
        taxAmountCents: row.taxAmountCents,
        grossAmountCents: row.grossAmountCents,
        currency: row.currency,
        status: row.status,
      })),
    });
  }
}
