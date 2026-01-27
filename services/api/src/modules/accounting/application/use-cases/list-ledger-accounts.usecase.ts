import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
} from "@corely/kernel";
import type { ListLedgerAccountsInput, ListLedgerAccountsOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapAccountToDto } from "../mappers/accounting.mapper";

export class ListLedgerAccountsUseCase extends BaseUseCase<
  ListLedgerAccountsInput,
  ListLedgerAccountsOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListLedgerAccountsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLedgerAccountsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const result = await this.deps.accountRepo.list(ctx.tenantId, input);

    return ok({
      accounts: result.accounts.map(mapAccountToDto),
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }
}
