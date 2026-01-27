import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
} from "@corely/kernel";
import type { ListJournalEntriesInput, ListJournalEntriesOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapEntryToDto } from "../mappers/accounting.mapper";

export class ListJournalEntriesUseCase extends BaseUseCase<
  ListJournalEntriesInput,
  ListJournalEntriesOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListJournalEntriesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListJournalEntriesOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const result = await this.deps.entryRepo.list(ctx.tenantId, input);

    const entries = await Promise.all(
      result.entries.map((e) => mapEntryToDto(e, this.deps.accountRepo, ctx.tenantId))
    );

    return ok({
      entries,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }
}
