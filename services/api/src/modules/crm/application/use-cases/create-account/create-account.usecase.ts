import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
} from "@corely/kernel";
import type { CreateAccountInput, CreateAccountOutput } from "@corely/contracts";
import type { AccountRepositoryPort } from "../../ports/account-repository.port";
import type { AccountProfileProps } from "../../../domain/account.aggregate";
import { PartyApplication } from "../../../../party/application/party.application";

type Deps = {
  clock: ClockPort;
  idGenerator: IdGeneratorPort;
  logger: LoggerPort;
  accountRepo: AccountRepositoryPort;
  partyApp: PartyApplication;
};

export class CreateAccountUseCase extends BaseUseCase<CreateAccountInput, CreateAccountOutput> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateAccountInput): CreateAccountInput {
    if (!input.name?.trim()) {
      throw new ValidationError("Account name is required");
    }
    return input;
  }

  protected async handle(
    input: CreateAccountInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateAccountOutput, UseCaseError>> {
    if (!ctx.tenantId) return err(new ValidationError("Tenant ID required"));

    const now = this.deps.clock.now();

    // 1. Create Party (canonical identity) via Party module
    const partyResult = await this.deps.partyApp.createCustomer.execute(
      {
        displayName: input.name,
        kind: "ORGANIZATION",
        website: input.website || undefined,
        email: input.email || undefined,
        phone: input.phone || undefined,
        industry: input.industry || undefined,
        notes: input.notes || undefined,
        role: "CUSTOMER",
      },
      ctx
    );

    // Extract partyId from result
    if ("error" in partyResult && partyResult.error) {
      return err(new ValidationError("Failed to create party: " + String(partyResult.error)));
    }

    const partyData = "value" in partyResult ? partyResult.value : null;
    if (!partyData?.customer?.id) {
      return err(new ValidationError("Party creation returned no ID"));
    }

    const partyId = partyData.customer.id;

    // 2. Create CRM Account Profile
    const profileId = this.deps.idGenerator.newId();
    const profile: AccountProfileProps = {
      id: profileId,
      tenantId: ctx.tenantId,
      partyId,
      accountType: input.accountType ?? "CUSTOMER",
      status: input.status ?? "ACTIVE",
      industry: input.industry,
      ownerUserId: input.ownerUserId,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.accountRepo.createProfile(profile);

    // 3. Read back the composed account
    const account = await this.deps.accountRepo.findById(ctx.tenantId, profileId);
    if (!account) {
      return err(new ValidationError("Account created but not found on read-back"));
    }

    return ok({ account: account.toDto() });
  }
}
