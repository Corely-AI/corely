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
import type { GetVendorBillInput, GetVendorBillOutput } from "@corely/contracts";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { VendorBillDeps } from "./purchasing-bill.deps";

@RequireTenant()
export class GetVendorBillUseCase extends BaseUseCase<GetVendorBillInput, GetVendorBillOutput> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<GetVendorBillOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const vendorBill = await this.services.repo.findById(tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}
