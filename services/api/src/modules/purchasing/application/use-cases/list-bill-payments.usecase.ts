import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListBillPaymentsInput, ListBillPaymentsOutput } from "@corely/contracts";
import { toBillPaymentDto } from "../mappers/purchasing-dto.mapper";
import type { PaymentDeps } from "./purchasing-payment.deps";

@RequireTenant()
export class ListBillPaymentsUseCase extends BaseUseCase<
  ListBillPaymentsInput,
  ListBillPaymentsOutput
> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListBillPaymentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListBillPaymentsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const payments = await this.services.paymentRepo.listByBill(tenantId, input.vendorBillId);

    return ok({ payments: payments.map(toBillPaymentDto) });
  }
}
