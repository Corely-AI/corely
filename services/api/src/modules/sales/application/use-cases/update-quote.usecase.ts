import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  err,
  ok,
  parseLocalDate,
  RequireTenant,
} from "@corely/kernel";
import type { UpdateQuoteInput, UpdateQuoteOutput } from "@corely/contracts";
import { toQuoteDto } from "../mappers/sales-dto.mapper";
import type { QuoteDeps } from "./sales-quote.deps";
import { buildLineItems } from "./sales-quote.helpers";

@RequireTenant()
export class UpdateQuoteUseCase extends BaseUseCase<UpdateQuoteInput, UpdateQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateQuoteOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const quote = await this.services.quoteRepo.findById(tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      quote.updateHeader(
        {
          customerPartyId: input.headerPatch.customerPartyId,
          customerContactPartyId: input.headerPatch.customerContactPartyId,
          issueDate: input.headerPatch.issueDate
            ? parseLocalDate(input.headerPatch.issueDate)
            : undefined,
          validUntilDate: input.headerPatch.validUntilDate
            ? parseLocalDate(input.headerPatch.validUntilDate)
            : undefined,
          currency: input.headerPatch.currency,
          paymentTerms: input.headerPatch.paymentTerms,
          notes: input.headerPatch.notes,
        },
        now
      );
    }

    if (input.lineItems) {
      const lineItems = buildLineItems({
        idGenerator: this.services.idGenerator,
        lineItems: input.lineItems,
      });
      quote.replaceLineItems(lineItems, now);
    }

    await this.services.quoteRepo.save(tenantId, quote);
    return ok({ quote: toQuoteDto(quote) });
  }
}
