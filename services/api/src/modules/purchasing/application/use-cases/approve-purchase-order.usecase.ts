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
import type { ApprovePurchaseOrderInput, ApprovePurchaseOrderOutput } from "@corely/contracts";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { PurchaseOrderDeps } from "./purchasing-order.deps";

@RequireTenant()
export class ApprovePurchaseOrderUseCase extends BaseUseCase<
  ApprovePurchaseOrderInput,
  ApprovePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ApprovePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<ApprovePurchaseOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<ApprovePurchaseOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.approve-po",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const purchaseOrder = await this.services.repo.findById(tenantId, input.purchaseOrderId);
    if (!purchaseOrder) {
      return err(new NotFoundError("Purchase order not found"));
    }

    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now: this.services.clock.now(),
      });
    }

    const number = await allocateUniqueNumber({
      next: () => settings!.allocatePoNumber(),
      isTaken: (candidate) => this.services.repo.isPoNumberTaken(tenantId, candidate),
    });

    const now = this.services.clock.now();
    try {
      purchaseOrder.approve(number, now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.services.repo.save(tenantId, purchaseOrder);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "purchasing.po.approved",
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      metadata: { poNumber: purchaseOrder.poNumber },
    });

    const result = { purchaseOrder: toPurchaseOrderDto(purchaseOrder) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.approve-po",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
