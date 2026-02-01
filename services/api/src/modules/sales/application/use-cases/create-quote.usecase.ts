import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  err,
  ok,
  parseLocalDate,
  RequireTenant,
} from "@corely/kernel";
import type { CreateQuoteInput, CreateQuoteOutput } from "@corely/contracts";
import { QuoteAggregate } from "../../domain/quote.aggregate";
import { toQuoteDto } from "../mappers/sales-dto.mapper";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { QuoteDeps } from "./sales-quote.deps";
import { buildLineItems } from "./sales-quote.helpers";

@RequireTenant()
export class CreateQuoteUseCase extends BaseUseCase<CreateQuoteInput, CreateQuoteOutput> {
  constructor(private readonly services: QuoteDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreateQuoteInput): CreateQuoteInput {
    if (!input.customerPartyId) {
      throw new ValidationError("customerPartyId is required");
    }
    if (!input.currency) {
      throw new ValidationError("currency is required");
    }
    if (!input.lineItems?.length) {
      throw new ValidationError("At least one line item is required");
    }
    return input;
  }

  protected async handle(
    input: CreateQuoteInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateQuoteOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const cached = await getIdempotentResult<CreateQuoteOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-quote",
      tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const customer = await this.services.customerQuery.getCustomerBillingSnapshot(
      tenantId,
      input.customerPartyId
    );
    if (!customer) {
      return err(new NotFoundError("Customer not found"));
    }

    const now = this.services.clock.now();
    const issueDate = input.issueDate ? parseLocalDate(input.issueDate) : null;
    const validUntilDate = input.validUntilDate ? parseLocalDate(input.validUntilDate) : null;
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const quote = QuoteAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId,
      customerPartyId: input.customerPartyId,
      customerContactPartyId: input.customerContactPartyId ?? null,
      issueDate,
      validUntilDate,
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      lineItems,
      now,
    });

    await this.services.quoteRepo.create(tenantId, quote);

    const result = { quote: toQuoteDto(quote) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.create-quote",
      tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
