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
import type { UpdateSalesOrderInput, UpdateSalesOrderOutput } from "@corely/contracts";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import type { OrderDeps } from "./sales-order.deps";
import { buildLineItems } from "./sales-order.helpers";

@RequireTenant()
export class UpdateSalesOrderUseCase extends BaseUseCase<
  UpdateSalesOrderInput,
  UpdateSalesOrderOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateSalesOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateSalesOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const order = await this.services.orderRepo.findById(tenantId, input.orderId);
    if (!order) {
      return err(new NotFoundError("Sales order not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      order.updateHeader(
        {
          customerPartyId: input.headerPatch.customerPartyId,
          customerContactPartyId: input.headerPatch.customerContactPartyId,
          orderDate: input.headerPatch.orderDate
            ? parseLocalDate(input.headerPatch.orderDate)
            : undefined,
          deliveryDate: input.headerPatch.deliveryDate
            ? parseLocalDate(input.headerPatch.deliveryDate)
            : undefined,
          currency: input.headerPatch.currency,
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
      order.replaceLineItems(lineItems, now);
    }

    await this.services.orderRepo.save(tenantId, order);
    return ok({ order: toOrderDto(order) });
  }
}
