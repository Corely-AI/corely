import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListVendorBillsInput, ListVendorBillsOutput } from "@corely/contracts";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { VendorBillDeps } from "./purchasing-bill.deps";

@RequireTenant()
export class ListVendorBillsUseCase extends BaseUseCase<
  ListVendorBillsInput,
  ListVendorBillsOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListVendorBillsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListVendorBillsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.services.repo.list(tenantId, {
      status: input.status,
      supplierPartyId: input.supplierPartyId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      dueFromDate: input.dueFromDate,
      dueToDate: input.dueToDate,
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toVendorBillDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
