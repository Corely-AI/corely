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
import type { CreatePurchaseOrderInput, CreatePurchaseOrderOutput } from "@corely/contracts";
import { PurchaseOrderAggregate } from "../../domain/purchase-order.aggregate";
import { toPurchaseOrderDto } from "../mappers/purchasing-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { PurchaseOrderDeps } from "./purchasing-order.deps";
import { buildLineItems } from "./purchasing-order.helpers";

@RequireTenant()
export class CreatePurchaseOrderUseCase extends BaseUseCase<
  CreatePurchaseOrderInput,
  CreatePurchaseOrderOutput
> {
  constructor(private readonly services: PurchaseOrderDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreatePurchaseOrderInput): CreatePurchaseOrderInput {
    if (!input.supplierPartyId) {
      throw new ValidationError("supplierPartyId is required");
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
    input: CreatePurchaseOrderInput,
    ctx: UseCaseContext
  ): Promise<Result<CreatePurchaseOrderOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<CreatePurchaseOrderOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-po",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const supplier = await this.services.supplierQuery.getSupplierById(
      tenantId,
      input.supplierPartyId
    );
    if (!supplier) {
      return err(new NotFoundError("Supplier not found"));
    }

    const now = this.services.clock.now();
    const orderDate = input.orderDate ? parseLocalDate(input.orderDate) : null;
    const expectedDeliveryDate = input.expectedDeliveryDate
      ? parseLocalDate(input.expectedDeliveryDate)
      : null;
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const purchaseOrder = PurchaseOrderAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId,
      supplierPartyId: input.supplierPartyId,
      supplierContactPartyId: input.supplierContactPartyId ?? null,
      orderDate,
      expectedDeliveryDate,
      currency: input.currency,
      notes: input.notes,
      lineItems,
      now,
    });

    await this.services.repo.create(tenantId, purchaseOrder);

    const result = { purchaseOrder: toPurchaseOrderDto(purchaseOrder) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-po",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
