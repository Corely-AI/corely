import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListReservationsInput, ListReservationsOutput } from "@corely/contracts";
import { toStockReservationDto } from "../mappers/inventory-dto.mapper";
import { type StockDeps } from "./stock.deps";

@RequireTenant()
export class ListReservationsUseCase extends BaseUseCase<
  ListReservationsInput,
  ListReservationsOutput
> {
  constructor(protected readonly deps: StockDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListReservationsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListReservationsOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.deps.reservationRepo.list(tenantId, {
      productId: input.productId,
      documentId: input.documentId,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toStockReservationDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
