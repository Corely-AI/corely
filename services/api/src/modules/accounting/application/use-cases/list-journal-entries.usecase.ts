import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  RequireTenant,
} from "@corely/kernel";
import type { ListJournalEntriesInput, ListJournalEntriesOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapEntryToDto } from "../mappers/accounting.mapper";

@RequireTenant()
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
    const tenantId = ctx.tenantId!;

    const result = await this.deps.entryRepo.list(tenantId, input);

    const entries = await Promise.all(
      result.entries.map((e) => mapEntryToDto(e, this.deps.accountRepo, tenantId))
    );

    return ok({
      entries,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }
}
