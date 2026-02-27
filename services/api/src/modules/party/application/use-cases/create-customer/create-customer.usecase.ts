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
  PartySocialLinksSchema,
  type CreateCustomerInput,
  type CreateCustomerOutput,
} from "@corely/contracts";
import { type PartyRepoPort } from "../../ports/party-repository.port";
import { PartyAggregate } from "../../../domain/party.aggregate";
import type { Address } from "../../../domain/address";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type {
  CustomFieldsWritePort,
  DimensionsWritePort,
} from "../../../../platform-custom-attributes/application/ports/custom-attributes.ports";

type Deps = {
  logger: LoggerPort;
  partyRepo: PartyRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  dimensionsWritePort: DimensionsWritePort;
  customFieldsWritePort: CustomFieldsWritePort;
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
    const birthday = input.birthday ? new Date(`${input.birthday}T00:00:00.000Z`) : null;
    const billingAddress = input.billingAddress
      ? (CustomerBillingAddressSchema.parse(input.billingAddress) as Address)
      : null;
    const socialLinks = input.socialLinks
      ? PartySocialLinksSchema.parse(input.socialLinks).map((link) => ({
          platform: link.platform,
          url: link.url,
          label: link.label ?? null,
          isPrimary: link.isPrimary ?? false,
        }))
      : undefined;

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
      socialLinks,
      lifecycleStatus: input.lifecycleStatus,
      kind: input.kind,
      firstName: input.firstName,
      lastName: input.lastName,
      organizationName: input.organizationName,
      jobTitle: input.jobTitle,
      department: input.department,
      industry: input.industry,
      website: input.website,
      birthday,
      createdAt: now,
      generateId: () => this.useCaseDeps.idGenerator.newId(),
    });

    await this.useCaseDeps.partyRepo.createCustomer(ctx.tenantId, party);
    await this.useCaseDeps.dimensionsWritePort.setEntityAssignments(
      ctx.tenantId,
      "party",
      party.id,
      input.dimensionAssignments ?? []
    );
    await this.useCaseDeps.customFieldsWritePort.setEntityValues(
      ctx.tenantId,
      "party",
      party.id,
      input.customFieldValues ?? {}
    );
    return ok({ customer: toCustomerDto(party) });
  }
}
