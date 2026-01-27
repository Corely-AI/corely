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
import type { SendPurchaseOrderInput, SendPurchaseOrderOutput } from "@corely/contracts";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import type { PurchaseOrderDeps } from "./purchasing-order.deps";

@RequireTenant()
export class SendPurchaseOrderUseCase extends BaseUseCase<
  SendPurchaseOrderInput,
  SendPurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: SendPurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<SendPurchaseOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const purchaseOrder = await this.services.repo.findById(tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    const now = this.services.clock.now();
    try {
      purchaseOrder.markSent(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(tenantId, purchaseOrder);

    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "purchasing.po.sent",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}
