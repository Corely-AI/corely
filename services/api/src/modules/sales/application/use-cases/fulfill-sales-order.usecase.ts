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
import type { FulfillSalesOrderInput, FulfillSalesOrderOutput } from "@corely/contracts";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { OrderDeps } from "./sales-order.deps";

@RequireTenant()
export class FulfillSalesOrderUseCase extends BaseUseCase<
  FulfillSalesOrderInput,
  FulfillSalesOrderOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: FulfillSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<FulfillSalesOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<FulfillSalesOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.fulfill-order",
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
    order.fulfill(now, now);
    await this.services.orderRepo.save(tenantId, order);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "sales.order.fulfilled",
      entityType: "SalesOrder",
      entityId: order.id,
    });

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.fulfill-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
