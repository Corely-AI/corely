import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ok,
  parseLocalDate,
  RequireTenant,
  err,
} from "@corely/kernel";
import type { UpdatePurchaseOrderInput, UpdatePurchaseOrderOutput } from "@corely/contracts";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import type { PurchaseOrderDeps } from "./purchasing-order.deps";
import { buildLineItems } from "./purchasing-order.helpers";

@RequireTenant()
export class UpdatePurchaseOrderUseCase extends BaseUseCase<
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdatePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdatePurchaseOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const purchaseOrder = await this.services.repo.findById(tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      purchaseOrder.updateHeader(
        {
          supplierPartyId: input.headerPatch.supplierPartyId,
          supplierContactPartyId: input.headerPatch.supplierContactPartyId,
          orderDate: input.headerPatch.orderDate
            ? parseLocalDate(input.headerPatch.orderDate)
            : undefined,
          expectedDeliveryDate: input.headerPatch.expectedDeliveryDate
            ? parseLocalDate(input.headerPatch.expectedDeliveryDate)
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
      purchaseOrder.replaceLineItems(lineItems, now);
    }

    await this.services.repo.save(tenantId, purchaseOrder);
    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}
