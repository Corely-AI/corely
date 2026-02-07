import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import {
  CustomerBillingAddressSchema,
  type CreateCustomerInput,
  type CreateCustomerOutput,
} from "@corely/contracts";
import { type PartyRepoPort } from "../../ports/party-repository.port";
import { PartyAggregate } from "../../../domain/party.aggregate";
import type { Address } from "../../../domain/address";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class CreateCustomerUseCase extends BaseUseCase<CreateCustomerInput, CreateCustomerOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CreateCustomerInput): CreateCustomerInput {
    if (!input.displayName.trim()) {
      throw new ValidationError("displayName is required");
    }
    return input;
  }

  protected async handle(
    input: CreateCustomerInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCustomerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const now = this.useCaseDeps.clock.now();
    const billingAddress = input.billingAddress
      ? (CustomerBillingAddressSchema.parse(input.billingAddress) as Address)
      : null;

    const roles: PartyAggregate["roles"] = ["CUSTOMER"];
    if (input.role && !roles.includes(input.role)) {
      roles.push(input.role);
    }

    const party = PartyAggregate.createParty({
      id: this.useCaseDeps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      displayName: input.displayName,
      roles,
      email: input.email ?? null,
      phone: input.phone ?? null,
      billingAddress,
      vatId: input.vatId ?? null,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      createdAt: now,
      generateId: () => this.useCaseDeps.idGenerator.newId(),
    });

    await this.useCaseDeps.partyRepo.createCustomer(ctx.tenantId, party);
    return ok({ customer: toCustomerDto(party) });
  }
}
