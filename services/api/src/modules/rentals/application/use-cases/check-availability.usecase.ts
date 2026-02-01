import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  ValidationError,
  type UseCaseError,
  RequireTenant,
} from "@corely/kernel";
import { type CheckAvailabilityInput, type CheckAvailabilityOutput } from "@corely/contracts";
import { type AvailabilityRepoPort } from "../ports/availability-repository.port";
import { type PropertyRepoPort } from "../ports/property-repository.port";
import { assertPublicModuleEnabled } from "../../../../shared/public";

@RequireTenant()
export class CheckAvailabilityUseCase extends BaseUseCase<
  CheckAvailabilityInput,
  CheckAvailabilityOutput
> {
  constructor(
    private readonly useCaseDeps: {
      availabilityRepo: AvailabilityRepoPort;
      propertyRepo: PropertyRepoPort;
    }
  ) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: CheckAvailabilityInput,
    ctx: UseCaseContext
  ): Promise<Result<CheckAvailabilityOutput, UseCaseError>> {
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
      input.propertySlug
    );
    if (!property) {
      return err(new ValidationError("Property not found or not published"));
    }

    const fromDate = new Date(input.from);
    const toDate = new Date(input.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return err(new ValidationError("Invalid date format"));
    }

    if (fromDate >= toDate) {
      return err(new ValidationError("Start date must be before end date"));
    }

    const blockedOverlaps = await this.useCaseDeps.availabilityRepo.findOverlapping(
      property.id,
      fromDate,
      toDate,
      "BLOCKED"
    );

    const isAvailable = blockedOverlaps.length === 0;

    return ok({
      isAvailable,
      blockedRanges: blockedOverlaps,
    });
  }
}
