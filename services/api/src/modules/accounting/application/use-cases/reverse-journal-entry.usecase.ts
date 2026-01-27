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
import type { ReverseJournalEntryInput, ReverseJournalEntryOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapEntryToDto } from "../mappers/accounting.mapper";
import { JournalEntryAggregate } from "../../domain/journal-entry.aggregate";

@RequireTenant()
export class ReverseJournalEntryUseCase extends BaseUseCase<
  ReverseJournalEntryInput,
  ReverseJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ReverseJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<ReverseJournalEntryOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const originalEntry = await this.deps.entryRepo.findById(tenantId, input.entryId);
    if (!originalEntry) {
      return err(new NotFoundError("Journal entry not found"));
    }

    if (originalEntry.status !== "Posted") {
      return err(new ValidationError("Only posted entries can be reversed"));
    }

    if (originalEntry.reversedByEntryId) {
      return err(new ValidationError("Entry has already been reversed"));
    }

    // Check period locking for reversal date
    const settings = await this.deps.settingsRepo.findByTenant(tenantId);
    if (settings?.periodLockingEnabled) {
      const period = await this.deps.periodRepo.findPeriodContainingDate(
        tenantId,
        input.reversalDate
      );
      if (!period) {
        return err(new ValidationError("No period found for reversal date"));
      }
      if (period.status === "Closed") {
        return err(
          new ValidationError(
            `Reversal date ${input.reversalDate} is in closed period ${period.name}`
          )
        );
      }
    }

    const now = this.deps.clock.now();

    // Create reversal entry
    const reversalEntry = JournalEntryAggregate.createReversal({
      id: this.deps.idGenerator.newId(),
      tenantId,
      originalEntry,
      reversalDate: input.reversalDate,
      reversalMemo: input.reversalMemo,
      createdBy: ctx.userId,
      now,
    });

    // Auto-post the reversal
    if (!settings) {
      return err(new ValidationError("Accounting not set up"));
    }
    const entryNumber = settings.allocateEntryNumber();
    await this.deps.settingsRepo.save(settings);

    reversalEntry.post({ entryNumber, postedBy: ctx.userId, now });

    // Mark original as reversed
    originalEntry.markAsReversed(reversalEntry.id, now);

    // Save both
    await this.deps.entryRepo.save(reversalEntry);
    await this.deps.entryRepo.save(originalEntry);

    return ok({
      originalEntry: await mapEntryToDto(originalEntry, this.deps.accountRepo, tenantId),
      reversalEntry: await mapEntryToDto(reversalEntry, this.deps.accountRepo, tenantId),
    });
  }
}
