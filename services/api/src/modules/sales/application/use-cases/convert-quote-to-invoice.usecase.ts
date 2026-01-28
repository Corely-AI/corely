import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  isErr,
  RequireTenant,
} from "@corely/kernel";
import type { ConvertQuoteToInvoiceInput, ConvertQuoteToInvoiceOutput } from "@corely/contracts";
import { mapUnifiedInvoiceToSalesInvoice } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { QuoteDeps } from "./sales-quote.deps";

@RequireTenant()
export class ConvertQuoteToInvoiceUseCase extends BaseUseCase<
  ConvertQuoteToInvoiceInput,
  ConvertQuoteToInvoiceOutput
> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ConvertQuoteToInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<ConvertQuoteToInvoiceOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<ConvertQuoteToInvoiceOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-invoice",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();

    // Delegate to unified Invoice module via command port
    const result = await this.services.invoiceCommands.createDraftFromSalesSource(
      {
        sourceType: "quote",
        sourceId: quote.id,
        customerPartyId: quote.customerPartyId,
        customerContactPartyId: quote.customerContactPartyId || undefined,
        currency: quote.currency,
        invoiceDate: quote.issueDate || undefined,
        notes: quote.notes || undefined,
        terms: quote.paymentTerms || undefined,
        lineItems: quote.lineItems.map((line) => ({
          description: line.description,
          qty: line.quantity,
          unitPriceCents: line.unitPriceCents,
        })),
        idempotencyKey: input.idempotencyKey,
      },
      ctx
    );

    if (isErr(result)) {
      return result;
    }

    const { invoice } = result.value;

    quote.markConverted({ invoiceId: invoice.id }, now);
    await this.services.quoteRepo.save(tenantId, quote);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.quote.converted_to_invoice",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { invoiceId: invoice.id },
    });

    const payload = { invoice: mapUnifiedInvoiceToSalesInvoice(invoice) };

    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-invoice",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: payload,
    });

    return ok(payload);
  }
}
