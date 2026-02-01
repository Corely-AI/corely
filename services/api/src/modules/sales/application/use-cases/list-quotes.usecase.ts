import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { ListQuotesInput, ListQuotesOutput } from "@corely/contracts";
import { toQuoteDto } from "../mappers/sales-dto.mapper";
import type { QuoteDeps } from "./sales-quote.deps";

@RequireTenant()
export class ListQuotesUseCase extends BaseUseCase<ListQuotesInput, ListQuotesOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListQuotesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListQuotesOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const result = await this.services.quoteRepo.list(
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
      items: result.items.map(toQuoteDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
