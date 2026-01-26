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

    const salesNetCents = details.sales.reduce((sum, row) => sum + row.netAmountCents, 0);
    const salesVatCents = details.sales.reduce((sum, row) => sum + row.taxAmountCents, 0);
    const salesGrossCents = details.sales.reduce((sum, row) => sum + row.grossAmountCents, 0);

    const purchaseNetCents = details.purchases.reduce((sum, row) => sum + row.netAmountCents, 0);
    const purchaseVatCents = details.purchases.reduce((sum, row) => sum + row.taxAmountCents, 0);
    const purchaseGrossCents = details.purchases.reduce(
      (sum, row) => sum + row.grossAmountCents,
      0
    );

    return {
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
    };
  }
}
