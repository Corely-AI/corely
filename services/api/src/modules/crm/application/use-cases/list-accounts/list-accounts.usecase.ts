import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  type LoggerPort,
  RequireTenant,
} from "@corely/kernel";
import type { ListAccountsQuery, ListAccountsResponse } from "@corely/contracts";
import type { AccountRepositoryPort } from "../../ports/account-repository.port";

type Deps = {
  logger: LoggerPort;
  accountRepo: AccountRepositoryPort;
};

@RequireTenant()
export class ListAccountsUseCase extends BaseUseCase<ListAccountsQuery, ListAccountsResponse> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: ListAccountsQuery): ListAccountsQuery {
    return input;
  }

  protected async handle(
    input: ListAccountsQuery,
    ctx: UseCaseContext
  ): Promise<Result<ListAccountsResponse, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("Tenant ID required"));
    }

    const { items, total } = await this.deps.accountRepo.list(
      ctx.tenantId,
      {
        status: input.status,
        accountType: input.accountType,
        ownerUserId: input.ownerUserId,
        q: input.q,
      },
      {
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 20,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      }
    );

    return ok({
      items: items.map((a) => a.toDto()),
      total,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 20,
    });
  }
}
