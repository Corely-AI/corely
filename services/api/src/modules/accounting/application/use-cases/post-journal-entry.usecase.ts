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
import type { PostJournalEntryInput, PostJournalEntryOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapEntryToDto } from "../mappers/accounting.mapper";

@RequireTenant()
export class PostJournalEntryUseCase extends BaseUseCase<
  PostJournalEntryInput,
  PostJournalEntryOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: PostJournalEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<PostJournalEntryOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    if (!ctx.userId) {
      return err(new ValidationError("userId is required"));
    }

    const entry = await this.deps.entryRepo.findById(tenantId, input.entryId);
    if (!entry) {
      return err(new NotFoundError("Journal entry not found"));
    }

    // Check period locking
    const settings = await this.deps.settingsRepo.findByTenant(tenantId);
    if (settings?.periodLockingEnabled) {
      const period = await this.deps.periodRepo.findPeriodContainingDate(
        tenantId,
        entry.postingDate
      );
      if (!period) {
        return err(new ValidationError("No period found for posting date"));
      }
      if (period.status === "Closed") {
        return err(
          new ValidationError(
            `Posting date ${entry.postingDate} is in closed period ${period.name}`
          )
        );
      }
    }

    // Allocate entry number
    if (!settings) {
      return err(new ValidationError("Accounting not set up"));
    }
    const entryNumber = settings.allocateEntryNumber();
    await this.deps.settingsRepo.save(settings);

    const now = this.deps.clock.now();

    try {
      entry.post({ entryNumber, postedBy: ctx.userId, now });
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.deps.entryRepo.save(entry);

    return ok({ entry: await mapEntryToDto(entry, this.deps.accountRepo, tenantId) });
  }
}
