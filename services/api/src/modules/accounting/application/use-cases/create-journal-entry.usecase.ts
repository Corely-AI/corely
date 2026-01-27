import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
} from "@corely/kernel";
import type { CreateJournalEntryInput, CreateJournalEntryOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapEntryToDto } from "../mappers/accounting.mapper";
import { JournalEntryAggregate } from "../../domain/journal-entry.aggregate";

export class CreateJournalEntryUseCase extends BaseUseCase<
  CreateJournalEntryInput,
  CreateJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateJournalEntryOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    // Validate accounts exist and are active
    for (const line of input.lines) {
      const account = await this.deps.accountRepo.findById(ctx.tenantId, line.ledgerAccountId);
      if (!account) {
        return err(new ValidationError(`Account ${line.ledgerAccountId} not found`));
      }
      if (!account.isActive) {
        return err(new ValidationError(`Account ${account.code} ${account.name} is inactive`));
      }
    }

    const now = this.deps.clock.now();
    const lines = input.lines.map((l, idx) => ({
      id: `${this.deps.idGenerator.newId()}-line-${idx}`,
      ledgerAccountId: l.ledgerAccountId,
      direction: l.direction,
      amountCents: l.amountCents,
      currency: l.currency,
      lineMemo: l.lineMemo,
      reference: l.reference,
      tags: l.tags,
    }));

    const entry = JournalEntryAggregate.createDraft({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      postingDate: input.postingDate,
      memo: input.memo,
      lines,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceRef: input.sourceRef,
      createdBy: ctx.userId,
      now,
    });

    await this.deps.entryRepo.save(entry);

    return ok({ entry: await mapEntryToDto(entry, this.deps.accountRepo, ctx.tenantId) });
  }
}
