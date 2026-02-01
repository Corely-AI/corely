import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  RequireTenant,
} from "@corely/kernel";
import type { RejectQuoteInput, RejectQuoteOutput } from "@corely/contracts";
import { toQuoteDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { QuoteDeps } from "./sales-quote.deps";

@RequireTenant()
export class RejectQuoteUseCase extends BaseUseCase<RejectQuoteInput, RejectQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: RejectQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<RejectQuoteOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<RejectQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.reject-quote",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const quote = await this.services.quoteRepo.findById(tenantId, input.quoteId);
    if (!quote) {
      return err(new NotFoundError("Quote not found"));
    }

    const now = this.services.clock.now();
    quote.reject(now, now);
    await this.services.quoteRepo.save(tenantId, quote);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "sales.quote.rejected",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { number: quote.number },
    });

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.reject-quote",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
