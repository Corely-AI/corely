import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  NotFoundError,
  type UseCaseError,
} from "@corely/kernel";
import { type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";

export class PublishPropertyUseCase extends BaseUseCase<{ id: string }, RentalProperty> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: { id: string },
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty, UseCaseError>> {
    const property = await this.useCaseDeps.propertyRepo.findById(ctx.tenantId!, input.id);
    if (!property) {
      return err(new NotFoundError("Property not found"));
    }

    const updated = await this.useCaseDeps.propertyRepo.save(ctx.tenantId!, ctx.workspaceId!, {
      id: property.id,
      status: "PUBLISHED",
      publishedAt: new Date().toISOString() as any,
    } as any);

    return ok(updated);
  }
}
