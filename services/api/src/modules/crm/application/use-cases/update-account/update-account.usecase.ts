import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  type ClockPort,
  type LoggerPort,
} from "@corely/kernel";
import type { UpdateAccountInput, AccountDto } from "@corely/contracts";
import type { AccountRepositoryPort } from "../../ports/account-repository.port";
import { PartyApplication } from "../../../../party/application/party.application";

type UpdateAccountUseCaseInput = UpdateAccountInput & { id: string };

type Deps = {
  clock: ClockPort;
  logger: LoggerPort;
  accountRepo: AccountRepositoryPort;
  partyApp: PartyApplication;
};

export class UpdateAccountUseCase extends BaseUseCase<UpdateAccountUseCaseInput, { account: AccountDto }> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: UpdateAccountUseCaseInput): UpdateAccountUseCaseInput {
    return input;
  }

  protected async handle(
    input: UpdateAccountUseCaseInput,
    ctx: UseCaseContext
  ): Promise<Result<{ account: AccountDto }, UseCaseError>> {
    if (!ctx.tenantId) return err(new ValidationError("Tenant ID required"));

    // 1. Load existing account
    const existing = await this.deps.accountRepo.findById(ctx.tenantId, input.id);
    if (!existing) return err(new ValidationError("Account not found"));

    const now = this.deps.clock.now();

    // 2. Update Party identity fields (if changed)
    const partyPatch: Record<string, unknown> = {};
    if (input.name !== undefined) partyPatch.displayName = input.name;
    if (input.website !== undefined) partyPatch.website = input.website;
    if (input.industry !== undefined) partyPatch.industry = input.industry;
    if (input.email !== undefined) partyPatch.email = input.email;
    if (input.phone !== undefined) partyPatch.phone = input.phone;

    if (Object.keys(partyPatch).length > 0) {
      const partyUpdateResult = await this.deps.partyApp.updateCustomer.execute(
        { id: existing.partyId, patch: partyPatch } as any,
        ctx
      );
      if ("error" in partyUpdateResult && partyUpdateResult.error) {
        return err(new ValidationError("Failed to update party identity: " + String(partyUpdateResult.error)));
      }
    }

    // 3. Update CRM profile fields
    const updatedProfile = {
      ...existing.profile,
      accountType: input.accountType ?? existing.profile.accountType,
      status: input.status ?? existing.profile.status,
      industry: input.industry ?? existing.profile.industry,
      ownerUserId: input.ownerUserId ?? existing.profile.ownerUserId,
      notes: input.notes ?? existing.profile.notes,
      updatedAt: now,
    };

    await this.deps.accountRepo.updateProfile(updatedProfile);

    // 4. Read-back composed account
    const updated = await this.deps.accountRepo.findById(ctx.tenantId, input.id);
    if (!updated) return err(new ValidationError("Account not found after update"));

    return ok({ account: updated.toDto() });
  }
}
