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
import type { GetQuoteInput, GetQuoteOutput } from "@corely/contracts";
import { toQuoteDto } from "../mappers/sales-dto.mapper";
import type { QuoteDeps } from "./sales-quote.deps";

@RequireTenant()
export class GetQuoteUseCase extends BaseUseCase<GetQuoteInput, GetQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<GetQuoteOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const quote = await this.services.quoteRepo.findById(tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }
    return ok({ quote: toQuoteDto(quote) });
  }
}
