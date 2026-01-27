import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
} from "@corely/kernel";
import type { UpdateLedgerAccountInput, UpdateLedgerAccountOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapAccountToDto } from "../mappers/accounting.mapper";

export class UpdateLedgerAccountUseCase extends BaseUseCase<
  UpdateLedgerAccountInput,
  UpdateLedgerAccountOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpdateLedgerAccountInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateLedgerAccountOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const account = await this.deps.accountRepo.findById(ctx.tenantId, input.accountId);
    if (!account) {
      return err(new NotFoundError("Account not found"));
    }

    const now = this.deps.clock.now();

    if (input.name || input.description !== undefined) {
      account.update({ name: input.name, description: input.description, now });
    }

    if (input.isActive !== undefined) {
      if (input.isActive) {
        account.activate(now);
      } else {
        account.deactivate(now);
      }
    }

    await this.deps.accountRepo.save(account);

    return ok({ account: mapAccountToDto(account) });
  }
}
