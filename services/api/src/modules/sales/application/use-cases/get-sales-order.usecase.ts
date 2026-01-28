import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { GetSalesOrderInput, GetSalesOrderOutput } from "@corely/contracts";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import type { OrderDeps } from "./sales-order.deps";

@RequireTenant()
export class GetSalesOrderUseCase extends BaseUseCase<GetSalesOrderInput, GetSalesOrderOutput> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<GetSalesOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const order = await this.services.orderRepo.findById(tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }
    return ok({ order: toOrderDto(order) });
  }
}
