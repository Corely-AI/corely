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
import type { GetPurchaseOrderInput, GetPurchaseOrderOutput } from "@corely/contracts";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import type { PurchaseOrderDeps } from "./purchasing-order.deps";

@RequireTenant()
export class GetPurchaseOrderUseCase extends BaseUseCase<
  GetPurchaseOrderInput,
  GetPurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetPurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPurchaseOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const purchaseOrder = await this.services.repo.findById(tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    return ok({ purchaseOrder: toPurchaseOrderDto(purchaseOrder) });
  }
}
