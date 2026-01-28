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
import type { UpdateVendorBillInput, UpdateVendorBillOutput } from "@corely/contracts";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { VendorBillDeps } from "./purchasing-bill.deps";
import { buildLineItems } from "./purchasing-bill.helpers";

@RequireTenant()
export class UpdateVendorBillUseCase extends BaseUseCase<
  UpdateVendorBillInput,
  UpdateVendorBillOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateVendorBillOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const vendorBill = await this.services.repo.findById(tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      vendorBill.updateHeader(
        {
          supplierPartyId: input.headerPatch.supplierPartyId,
          supplierContactPartyId: input.headerPatch.supplierContactPartyId,
          billNumber: input.headerPatch.billNumber,
          internalBillRef: input.headerPatch.internalBillRef,
          billDate: input.headerPatch.billDate
            ? parseLocalDate(input.headerPatch.billDate)
            : undefined,
          dueDate: input.headerPatch.dueDate
            ? parseLocalDate(input.headerPatch.dueDate)
            : undefined,
          currency: input.headerPatch.currency,
          paymentTerms: input.headerPatch.paymentTerms,
          notes: input.headerPatch.notes,
          purchaseOrderId: input.headerPatch.purchaseOrderId,
        },
        now
      );
    }

    if (input.lineItems) {
      const lineItems = buildLineItems({
        idGenerator: this.services.idGenerator,
        lineItems: input.lineItems,
      });
      vendorBill.replaceLineItems(lineItems, now);
    }

    await this.services.repo.save(tenantId, vendorBill);
    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}
