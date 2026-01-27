import { Injectable } from "@nestjs/common";
import type { GetVatPeriodSummaryInput, GetVatPeriodSummaryOutput } from "@corely/contracts";
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
export class GetVatPeriodSummaryUseCase extends BaseUseCase<
  GetVatPeriodSummaryInput,
  GetVatPeriodSummaryOutput
> {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: GetVatPeriodSummaryInput,
    ctx: UseCaseContext
  ): Promise<Result<GetVatPeriodSummaryOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);

    const profile = await this.taxProfileRepo.getActive(workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    const inputs = await this.vatPeriodQuery.getInputs(
      workspaceId,
      start,
      end,
      method as VatAccountingMethod
    );

    const period = this.periodResolver.resolveQuarter(start);
    const salesGrossCents = inputs.salesNetCents + inputs.salesVatCents;
    const purchaseGrossCents = inputs.purchaseNetCents + inputs.purchaseVatCents;
    const taxDueCents = inputs.salesVatCents - inputs.purchaseVatCents;

    const totalsByKind = {
      STANDARD: {
        netAmountCents: inputs.salesNetCents,
        taxAmountCents: inputs.salesVatCents,
        grossAmountCents: salesGrossCents,
        rateBps: 1900,
      },
    };

    return ok({
      summary: {
        id: period.key,
        tenantId,
        periodKey: period.key,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        currency: profile?.currency ?? "EUR",
        salesNetCents: inputs.salesNetCents,
        salesVatCents: inputs.salesVatCents,
        salesGrossCents,
        purchaseNetCents: inputs.purchaseNetCents,
        purchaseVatCents: inputs.purchaseVatCents,
        purchaseGrossCents,
        taxDueCents,
        totalsByKind,
        generatedAt: new Date().toISOString(),
        status: "OPEN",
        submissionDate: null,
        submissionReference: null,
        submissionNotes: null,
        archivedReason: null,
        pdfStorageKey: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }
}
