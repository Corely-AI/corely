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
import type { ConfirmSalesOrderInput, ConfirmSalesOrderOutput } from "@corely/contracts";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { OrderDeps } from "./sales-order.deps";

@RequireTenant()
export class ConfirmSalesOrderUseCase extends BaseUseCase<
  ConfirmSalesOrderInput,
  ConfirmSalesOrderOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ConfirmSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ConfirmSalesOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<ConfirmSalesOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.confirm-order",
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
    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now,
      });
    }

    const number = await allocateUniqueNumber({
      next: () => settings!.allocateOrderNumber(),
      isTaken: (candidate) => this.services.orderRepo.isOrderNumberTaken(tenantId, candidate),
    });

    order.confirm(number, now, now);
    await this.services.orderRepo.save(tenantId, order);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "sales.order.confirmed",
      entityType: "SalesOrder",
      entityId: order.id,
      metadata: { number: order.number },
    });

    const result = { order: toOrderDto(order) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.confirm-order",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
