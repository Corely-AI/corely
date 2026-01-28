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
import type { SendQuoteInput, SendQuoteOutput } from "@corely/contracts";
import { SalesSettingsAggregate } from "../../domain/settings.aggregate";
import { toQuoteDto } from "../mappers/sales-dto.mapper";
import { allocateUniqueNumber } from "./numbering";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { QuoteDeps } from "./sales-quote.deps";

@RequireTenant()
export class SendQuoteUseCase extends BaseUseCase<SendQuoteInput, SendQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: SendQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<SendQuoteOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const cached = await getIdempotentResult<SendQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.send-quote",
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
    let settings = await this.services.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      settings = SalesSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId,
        now,
      });
    }

    const number = await allocateUniqueNumber({
      next: () => settings!.allocateQuoteNumber(),
      isTaken: (candidate) => this.services.quoteRepo.isQuoteNumberTaken(tenantId, candidate),
    });
    quote.send(number, now, now);

    await this.services.quoteRepo.save(tenantId, quote);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId,
      userId: ctx.userId,
      action: "sales.quote.sent",
      entityType: "SalesQuote",
      entityId: quote.id,
      metadata: { number: quote.number },
    });

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.send-quote",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
