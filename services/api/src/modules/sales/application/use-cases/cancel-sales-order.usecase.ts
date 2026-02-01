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
import type { CancelSalesOrderInput, CancelSalesOrderOutput } from "@corely/contracts";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { OrderDeps } from "./sales-order.deps";

@RequireTenant()
export class CancelSalesOrderUseCase extends BaseUseCase<
  CancelSalesOrderInput,
  CancelSalesOrderOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: CancelSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CancelSalesOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<CancelSalesOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.cancel-order",
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
    order.cancel(now, now);
    await this.services.orderRepo.save(tenantId, order);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "sales.order.canceled",
      entityType: "SalesOrder",
      entityId: order.id,
    });

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.cancel-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
