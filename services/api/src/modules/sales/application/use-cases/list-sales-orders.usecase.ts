import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListSalesOrdersInput, ListSalesOrdersOutput } from "@corely/contracts";
import { toOrderDto } from "../mappers/sales-dto.mapper";
import type { OrderDeps } from "./sales-order.deps";

@RequireTenant()
export class ListSalesOrdersUseCase extends BaseUseCase<
  ListSalesOrdersInput,
  ListSalesOrdersOutput
> {
  constructor(private readonly services: OrderDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListSalesOrdersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListSalesOrdersOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.services.orderRepo.list(
      tenantId,
      {
        status: input.status as any,
        customerPartyId: input.customerPartyId,
        fromDate: input.fromDate ? new Date(`${input.fromDate}T00:00:00.000Z`) : undefined,
        toDate: input.toDate ? new Date(`${input.toDate}T23:59:59.999Z`) : undefined,
      },
      input.pageSize,
      input.cursor
    );

    return ok({
      items: result.items.map(toOrderDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
