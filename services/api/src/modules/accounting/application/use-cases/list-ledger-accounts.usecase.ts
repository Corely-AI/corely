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
import type { ListLedgerAccountsInput, ListLedgerAccountsOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapAccountToDto } from "../mappers/accounting.mapper";

@RequireTenant()
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
    const tenantId = ctx.tenantId!;

    const result = await this.deps.accountRepo.list(tenantId, input);

    return ok({
      accounts: result.accounts.map(mapAccountToDto),
      nextCursor: result.nextCursor,
      total: result.total,
    });
  }
}
