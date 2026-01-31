import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  NotFoundError,
  type UseCaseError,
  RequireTenant,
  ValidationError,
} from "@corely/kernel";
import { type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";
import { assertPublicModuleEnabled } from "../../../../shared/public";

@RequireTenant()
export class GetPublicPropertyUseCase extends BaseUseCase<{ slug: string }, RentalProperty> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "rentals");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const property = await this.useCaseDeps.propertyRepo.findBySlugPublic(
      ctx.tenantId,
      ctx.workspaceId,
      input.slug
    );
    if (!property) {
      return err(new NotFoundError("Property not found"));
    }
    return ok(property);
  }
}
