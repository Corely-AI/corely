import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  err,
  ok,
  isErr,
  RequireTenant,
} from "@corely/kernel";
import type { CreateInvoiceFromOrderInput, CreateInvoiceFromOrderOutput } from "@corely/contracts";
import { toOrderDto, mapUnifiedInvoiceToSalesInvoice } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { OrderDeps } from "./sales-order.deps";

@RequireTenant()
export class CreateInvoiceFromOrderUseCase extends BaseUseCase<
  CreateInvoiceFromOrderInput,
  CreateInvoiceFromOrderOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: CreateInvoiceFromOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceFromOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<CreateInvoiceFromOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-invoice-from-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const order = await this.services.orderRepo.findById(tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.services.clock.now();

    // Delegate to unified Invoice module via command port
    const result = await this.services.invoiceCommands.createDraftFromSalesSource(
      {
        sourceType: "order",
        sourceId: order.id,
        customerPartyId: order.customerPartyId,
        customerContactPartyId: order.customerContactPartyId || undefined,
        currency: order.currency,
        invoiceDate: order.orderDate || undefined,
        notes: order.notes || undefined,
        lineItems: order.lineItems.map((line) => ({
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

    order.markInvoiced(invoice.id, now);
    await this.services.orderRepo.save(tenantId, order);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "sales.order.invoiced",
      entityType: "SalesOrder",
      entityId: order.id,
      metadata: { invoiceId: invoice.id },
    });

    const payload = { invoice: mapUnifiedInvoiceToSalesInvoice(invoice) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-invoice-from-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: payload,
    });

    return ok(payload);
  }
}
