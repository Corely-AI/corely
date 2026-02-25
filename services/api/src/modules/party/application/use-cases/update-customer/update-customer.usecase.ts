import {
  CustomerBillingAddressSchema,
  PartySocialLinksSchema,
  type UpdateCustomerInput,
  type UpdateCustomerOutput,
} from "@corely/contracts";
import type {
  ClockPort,
  IdGeneratorPort,
  LoggerPort,
  Result,
  UseCaseContext,
  UseCaseError,
} from "@corely/kernel";
import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";
import type { PartyRepoPort } from "../../ports/party-repository.port";
import type { Address } from "../../../domain/address";
import type { CustomerPatch } from "../../../domain/party.aggregate";
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

export class UpdateCustomerUseCase extends BaseUseCase<UpdateCustomerInput, UpdateCustomerOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: UpdateCustomerInput): UpdateCustomerInput {
    if (!input.patch || Object.keys(input.patch).length === 0) {
      throw new ValidationError("Nothing to update");
    }
    return input;
  }

  protected async handle(
    input: UpdateCustomerInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateCustomerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const existing = await this.useCaseDeps.partyRepo.findCustomerById(
      ctx.tenantId,
      input.id,
      input.role
    );
    if (!existing) {
      return err(new NotFoundError("Customer not found"));
    }

    if (existing.archivedAt) {
      return err(new ConflictError("Cannot update an archived customer"));
    }

    try {
      const now = this.useCaseDeps.clock.now();
      const billingAddress = input.patch.billingAddress;
      const socialLinks = input.patch.socialLinks;
      const patch = {
        ...input.patch,
        birthday:
          input.patch.birthday === undefined
            ? undefined
            : input.patch.birthday === null
              ? null
              : new Date(`${input.patch.birthday}T00:00:00.000Z`),
        socialLinks:
          socialLinks === undefined || socialLinks === null
            ? socialLinks
            : PartySocialLinksSchema.parse(socialLinks).map((link) => ({
                platform: link.platform,
                url: link.url,
                label: link.label ?? null,
                isPrimary: link.isPrimary ?? false,
              })),
        billingAddress:
          billingAddress === undefined || billingAddress === null
            ? billingAddress
            : (CustomerBillingAddressSchema.parse(billingAddress) as Address),
      } as CustomerPatch;
      existing.updateCustomer(patch, now, () => this.useCaseDeps.idGenerator.newId());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid update";
      return err(new ValidationError(message));
    }

    await this.useCaseDeps.partyRepo.updateCustomer(ctx.tenantId, existing);
    if (input.patch.dimensionAssignments) {
      await this.useCaseDeps.dimensionsWritePort.setEntityAssignments(
        ctx.tenantId,
        "party",
        existing.id,
        input.patch.dimensionAssignments
      );
    }
    if (input.patch.customFieldValues !== undefined) {
      await this.useCaseDeps.customFieldsWritePort.setEntityValues(
        ctx.tenantId,
        "party",
        existing.id,
        input.patch.customFieldValues ?? {}
      );
    }
    return ok({ customer: toCustomerDto(existing) });
  }
}
