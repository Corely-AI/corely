import { Injectable } from "@nestjs/common";
import type {
  GetVatPeriodSummaryInput,
  GetVatPeriodSummaryOutput,
} from "@corely/contracts";
import type { UseCaseContext } from "./use-case-context";
import { VatPeriodResolver } from "../../domain/services/vat-period.resolver";
import { VatPeriodQueryPort, TaxProfileRepoPort } from "../../domain/ports";
import { VatAccountingMethod } from "@corely/contracts";

@Injectable()
export class GetVatPeriodSummaryUseCase {
  constructor(
    private readonly periodResolver: VatPeriodResolver,
    private readonly vatPeriodQuery: VatPeriodQueryPort,
    private readonly taxProfileRepo: TaxProfileRepoPort
  ) {}

  async execute(input: GetVatPeriodSummaryInput, ctx: UseCaseContext): Promise<GetVatPeriodSummaryOutput> {
    // Input has start/end from query param usually, or maybe periodKey?
    // Schema says periodStart/periodEnd ISO strings.
    // Ideally we resolve from key, but if input is start/end, we use that.
    
    // Wait, let's assume we use periodKey from URL param if available, but schema is generic.
    // If the controller parses :key to start/end, then we use start/end.
    
    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);

    const profile = await this.taxProfileRepo.getActive(ctx.workspaceId, new Date());
    const method = profile?.vatAccountingMethod ?? "IST";

    const inputs = await this.vatPeriodQuery.getInputs(
        ctx.workspaceId, 
        start, 
        end, 
        method as VatAccountingMethod
    );

    // Construct DTO
    // We treat everything as STANDARD for now as we don't have breakdown in inputs
    const totalsByKind = {
        STANDARD: { 
          netAmountCents: inputs.salesNetCents,
          taxAmountCents: inputs.salesVatCents,
          grossAmountCents: inputs.salesNetCents + inputs.salesVatCents,
          rateBps: 1900,
        }
    };

    return {
      summary: {
        id: `computed-${start.toISOString().split('T')[0]}`,
        tenantId: ctx.tenantId,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        currency: "EUR",
        totalsByKind,
        generatedAt: new Date().toISOString(),
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    };
  }
}
