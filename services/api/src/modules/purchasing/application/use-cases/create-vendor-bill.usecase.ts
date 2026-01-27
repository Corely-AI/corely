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
import type { CreateVendorBillInput, CreateVendorBillOutput } from "@corely/contracts";
import { VendorBillAggregate } from "../../domain/vendor-bill.aggregate";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { VendorBillDeps } from "./purchasing-bill.deps";
import { buildLineItems } from "./purchasing-bill.helpers";

@RequireTenant()
export class CreateVendorBillUseCase extends BaseUseCase<
  CreateVendorBillInput,
  CreateVendorBillOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreateVendorBillInput): CreateVendorBillInput {
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
    input: CreateVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateVendorBillOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<CreateVendorBillOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-bill",
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

    if (input.billNumber) {
      const existing = await this.services.repo.findBySupplierBillNumber(
        tenantId,
        input.supplierPartyId,
        input.billNumber
      );
      if (existing) {
        return err(
          new ValidationError(
            "Duplicate vendor bill",
            {
              existingBillId: existing.id,
              billNumber: existing.billNumber,
            },
            "DUPLICATE_BILL"
          )
        );
      }
    }

    const now = this.services.clock.now();
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const vendorBill = VendorBillAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId,
      supplierPartyId: input.supplierPartyId,
      supplierContactPartyId: input.supplierContactPartyId ?? null,
      billNumber: input.billNumber ?? null,
      internalBillRef: input.internalBillRef ?? null,
      billDate: parseLocalDate(input.billDate),
      dueDate: parseLocalDate(input.dueDate),
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      lineItems,
      purchaseOrderId: input.purchaseOrderId ?? null,
      now,
    });

    await this.services.repo.create(tenantId, vendorBill);

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-bill",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
