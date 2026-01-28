import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ConvertQuoteToOrderInput, ConvertQuoteToOrderOutput } from "@corely/contracts";
import { SalesOrderAggregate } from "../../domain/order.aggregate";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { QuoteDeps } from "./sales-quote.deps";

@RequireTenant()
export class ConvertQuoteToOrderUseCase extends BaseUseCase<
  ConvertQuoteToOrderInput,
  ConvertQuoteToOrderOutput
> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ConvertQuoteToOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ConvertQuoteToOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<ConvertQuoteToOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-order",
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
    const order = SalesOrderAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId,
      customerPartyId: quote.customerPartyId,
      customerContactPartyId: quote.customerContactPartyId,
      orderDate: quote.issueDate,
      deliveryDate: null,
      currency: quote.currency,
      notes: quote.notes,
      lineItems: quote.lineItems.map((line) => ({ ...line })),
      sourceQuoteId: quote.id,
      now,
    });

    await this.services.orderRepo.create(tenantId, order);
    quote.markConverted({ orderId: order.id }, now);
    await this.services.quoteRepo.save(tenantId, quote);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.quote.converted_to_order",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { orderId: order.id },
    });

    const payload = { order: toOrderDto(order) };

    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.convert-quote-to-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: payload,
    });

    return ok(payload);
  }
}
