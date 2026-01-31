import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  ValidationError,
  type UseCaseError,
} from "@corely/kernel";
import { type CreateRentalPropertyInput, type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";

export class CreatePropertyUseCase extends BaseUseCase<CreateRentalPropertyInput, RentalProperty> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: CreateRentalPropertyInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty, UseCaseError>> {
    const existing = await this.useCaseDeps.propertyRepo.findBySlug(ctx.tenantId!, input.slug);
    if (existing) {
      return err(new ValidationError("Property with this slug already exists"));
    }

    const property = await this.useCaseDeps.propertyRepo.save(
      ctx.tenantId!,
      ctx.workspaceId!,
      input
    );
    return ok(property);
  }
}
