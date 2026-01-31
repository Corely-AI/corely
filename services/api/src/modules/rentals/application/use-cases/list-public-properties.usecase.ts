import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  type UseCaseError,
  ValidationError,
  err,
} from "@corely/kernel";
import { type ListPublicRentalPropertiesInput, type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";
import { assertPublicModuleEnabled } from "../../../../shared/public";

export class ListPublicPropertiesUseCase extends BaseUseCase<
  ListPublicRentalPropertiesInput,
  RentalProperty[]
> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: ListPublicRentalPropertiesInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty[], UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "rentals");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const properties = await this.useCaseDeps.propertyRepo.listPublic(
      ctx.tenantId,
      ctx.workspaceId,
      input
    );
    return ok(properties);
  }
}
