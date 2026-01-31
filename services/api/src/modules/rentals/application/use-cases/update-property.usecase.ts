import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
  type UseCaseError,
} from "@corely/kernel";
import { type UpdateRentalPropertyInput, type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";

export class UpdatePropertyUseCase extends BaseUseCase<UpdateRentalPropertyInput, RentalProperty> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: UpdateRentalPropertyInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty, UseCaseError>> {
    const existing = await this.useCaseDeps.propertyRepo.findById(ctx.tenantId!, input.id);
    if (!existing) {
      return err(new NotFoundError("Property not found"));
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugExists = await this.useCaseDeps.propertyRepo.findBySlug(ctx.tenantId!, input.slug);
      if (slugExists) {
        return err(new ValidationError("Property with this slug already exists"));
      }
    }

    const updated = await this.useCaseDeps.propertyRepo.save(
      ctx.tenantId!,
      ctx.workspaceId!,
      input
    );
    return ok(updated);
  }
}
