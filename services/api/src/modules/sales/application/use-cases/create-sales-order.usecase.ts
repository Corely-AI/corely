import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  parseLocalDate,
  RequireTenant,
} from "@corely/kernel";
import type { CreateSalesOrderInput, CreateSalesOrderOutput } from "@corely/contracts";
import { SalesOrderAggregate } from "../../domain/order.aggregate";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { OrderDeps } from "./sales-order.deps";
import { buildLineItems } from "./sales-order.helpers";

@RequireTenant()
export class CreateSalesOrderUseCase extends BaseUseCase<
  CreateSalesOrderInput,
  CreateSalesOrderOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreateSalesOrderInput): CreateSalesOrderInput {
    if (!input.customerPartyId) {
      throw new ValidationError("customerPartyId is required");
    }
    if (!input.currency) {
      throw new ValidationError("currency is required");
    }
    if (!input.lineItems?.length) {
      throw new ValidationError("At least one line item is required");
    }
    return input;
  }

  protected async handle(
    input: CreateSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateSalesOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<CreateSalesOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const customer = await this.services.customerQuery.getCustomerBillingSnapshot(
      tenantId,
      input.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    const now = this.services.clock.now();
    const orderDate = input.orderDate ? parseLocalDate(input.orderDate) : null;
    const deliveryDate = input.deliveryDate ? parseLocalDate(input.deliveryDate) : null;
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const order = SalesOrderAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId,
      customerPartyId: input.customerPartyId,
      customerContactPartyId: input.customerContactPartyId ?? null,
      orderDate,
      deliveryDate,
      currency: input.currency,
      notes: input.notes,
      lineItems,
      sourceQuoteId: input.sourceQuoteId ?? null,
      now,
    });

    await this.services.orderRepo.create(tenantId, order);

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
