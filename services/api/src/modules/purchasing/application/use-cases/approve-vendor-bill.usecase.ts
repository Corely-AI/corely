import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ApproveVendorBillInput, ApproveVendorBillOutput } from "@corely/contracts";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { VendorBillDeps } from "./purchasing-bill.deps";

@RequireTenant()
export class ApproveVendorBillUseCase extends BaseUseCase<
  ApproveVendorBillInput,
  ApproveVendorBillOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ApproveVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<ApproveVendorBillOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const vendorBill = await this.services.repo.findById(tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    const now = this.services.clock.now();
    try {
      vendorBill.approve(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(tenantId, vendorBill);

    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.approved",
      entityType: "VendorBill",
      entityId: vendorBill.id,
    });

    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}
