import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
  RequireTenant,
} from "@corely/kernel";
import type { UpdateJournalEntryInput, UpdateJournalEntryOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapEntryToDto } from "../mappers/accounting.mapper";

@RequireTenant()
export class UpdateJournalEntryUseCase extends BaseUseCase<
  UpdateJournalEntryInput,
  UpdateJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateJournalEntryOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;

    const entry = await this.deps.entryRepo.findById(tenantId, input.entryId);
    if (!entry) {
      return err(new NotFoundError("Journal entry not found"));
    }

    if (entry.status !== "Draft") {
      return err(new ValidationError("Only draft entries can be updated"));
    }

    const now = this.deps.clock.now();
    const lines = input.lines
      ? input.lines.map((l, idx) => ({
          id: `${input.entryId}-line-${idx}`,
          ledgerAccountId: l.ledgerAccountId,
          direction: l.direction,
          amountCents: l.amountCents,
          currency: l.currency,
          lineMemo: l.lineMemo,
          reference: l.reference,
          tags: l.tags,
        }))
      : undefined;

    entry.updateDraft({
      postingDate: input.postingDate,
      memo: input.memo,
      lines,
      now,
    });

    await this.deps.entryRepo.save(entry);

    return ok({ entry: await mapEntryToDto(entry, this.deps.accountRepo, tenantId) });
  }
}
