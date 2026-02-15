import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  type LoggerPort,
} from "@corely/kernel";
import type { GetAccountOutput } from "@corely/contracts";
import type { AccountRepositoryPort } from "../../ports/account-repository.port";

type GetAccountInput = { id: string };

type Deps = {
  logger: LoggerPort;
  accountRepo: AccountRepositoryPort;
};

export class GetAccountUseCase extends BaseUseCase<GetAccountInput, GetAccountOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: GetAccountInput): GetAccountInput {
    return input;
  }

  protected async handle(
    input: GetAccountInput,
    ctx: UseCaseContext
  ): Promise<Result<GetAccountOutput, UseCaseError>> {
    if (!ctx.tenantId) return err(new ValidationError("Tenant ID required"));

    const account = await this.deps.accountRepo.findById(ctx.tenantId, input.id);
    if (!account) return err(new ValidationError("Account not found"));

    return ok({ account: account.toDto() });
  }
}
