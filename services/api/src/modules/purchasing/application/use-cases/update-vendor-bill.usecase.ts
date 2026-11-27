import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
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

    const vendorBill = await this.services.repo.findById(
      tenantId,
      input.vendorBillId,
      ctx.workspaceId
    );
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    if (vendorBill.status !== "DRAFT") {
      return err(new ValidationError("Vendor bill is not editable unless in draft"));
    }
    const patch = input.headerPatch;
    if (
      !vendorBill.sourceFilename &&
      patch &&
      (patch.supplierPartyId === null ||
        patch.billDate === null ||
        patch.dueDate === null ||
        patch.currency === null)
    ) {
      return err(new ValidationError("Existing bill details cannot be cleared"));
    }
    if (vendorBill.sourceFilename && patch) {
      if (patch.currency != null && !/^[A-Z]{3}$/.test(patch.currency)) {
        return err(new ValidationError("Use a three-letter currency code"));
      }
      if (
        patch.supplierPartyId &&
        !(await this.services.supplierQuery.getSupplierById(tenantId, patch.supplierPartyId))
      ) {
        return err(new ValidationError("Supplier not found"));
      }
      const supplierId =
        patch.supplierPartyId === undefined ? vendorBill.supplierPartyId : patch.supplierPartyId;
      const billNumber = patch.billNumber === undefined ? vendorBill.billNumber : patch.billNumber;
      if (supplierId && billNumber) {
        const existing = await this.services.repo.findBySupplierBillNumber(
          tenantId,
          supplierId,
          billNumber
        );
        if (existing && existing.id !== vendorBill.id) {
          return err(new ValidationError("Duplicate vendor bill"));
        }
      }
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
            : input.headerPatch.billDate === null
              ? null
              : undefined,
          dueDate: input.headerPatch.dueDate
            ? parseLocalDate(input.headerPatch.dueDate)
            : input.headerPatch.dueDate === null
              ? null
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
      if (
        vendorBill.sourceFilename &&
        input.lineItems.some((line) => !Number.isInteger(line.quantity))
      ) {
        return err(new ValidationError("Use whole numbers for line quantities"));
      }
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
