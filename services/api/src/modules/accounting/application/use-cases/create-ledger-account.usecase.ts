import {
  BaseUseCase,
  type UseCaseContext,
  type UseCaseError,
  type Result,
  ok,
  err,
  ValidationError,
  ConflictError,
  RequireTenant,
} from "@corely/kernel";
import type { CreateLedgerAccountInput, CreateLedgerAccountOutput } from "@corely/contracts";
import type { BaseDeps } from "./accounting-use-case.deps";
import { mapAccountToDto } from "../mappers/accounting.mapper";
import { LedgerAccountAggregate } from "../../domain/ledger-account.aggregate";

@RequireTenant()
export class CreateLedgerAccountUseCase extends BaseUseCase<
  CreateLedgerAccountInput,
  CreateLedgerAccountOutput
> {
  constructor(protected readonly deps: BaseDeps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateLedgerAccountInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLedgerAccountOutput, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    // Check for duplicate code
    const existing = await this.deps.accountRepo.findByCode(tenantId, input.code);
    if (existing) {
      return err(new ConflictError("Account code already exists"));
    }

    const now = this.deps.clock.now();
    const account = LedgerAccountAggregate.create({
      id: this.deps.idGenerator.newId(),
      tenantId,
      code: input.code,
      name: input.name,
      type: input.type,
      description: input.description,
      systemAccountKey: input.systemAccountKey,
      isActive: input.isActive,
      now,
    });

    await this.deps.accountRepo.save(account);

    return ok({ account: mapAccountToDto(account) });
  }
}
