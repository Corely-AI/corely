import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  RequireTenant,
  ValidationError,
  type AuditPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  DIRECTORY_ERROR_CODES,
  UpdateAdminDirectoryRestaurantResponseSchema,
  type UpdateAdminDirectoryRestaurantRequest,
  type UpdateAdminDirectoryRestaurantResponse,
} from "@corely/contracts";
import { toAdminDirectoryRestaurantDto } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

type AdminUpdateRestaurantCommand = {
  id: string;
  patch: UpdateAdminDirectoryRestaurantRequest;
};

@RequireTenant()
export class AdminUpdateRestaurantCommandUseCase extends BaseUseCase<
  AdminUpdateRestaurantCommand,
  UpdateAdminDirectoryRestaurantResponse
> {
  constructor(
    private readonly repo: DirectoryRepositoryPort,
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly audit: AuditPort
  ) {
    super({});
  }

  protected async handle(
    command: AdminUpdateRestaurantCommand,
    ctx: UseCaseContext
  ): Promise<Result<UpdateAdminDirectoryRestaurantResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

    const normalizedPatch = normalizePatch(command.patch);

    const response = await this.unitOfWork.withinTransaction(async (tx) => {
      const scope = {
        tenantId: ctx.tenantId!,
        workspaceId: ctx.workspaceId!,
      };

      const existing = await this.repo.getRestaurantById(scope, command.id);
      if (!existing) {
        throw new NotFoundError(
          "Restaurant not found",
          { id: command.id },
          DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND
        );
      }

      if (normalizedPatch.slug) {
        const slugMatch = await this.repo.findRestaurantBySlug(scope, normalizedPatch.slug, tx);
        if (slugMatch && slugMatch.id !== existing.id) {
          throw new ConflictError(
            "Restaurant slug already exists",
            { slug: normalizedPatch.slug },
            DIRECTORY_ERROR_CODES.SLUG_ALREADY_EXISTS
          );
        }
      }

      const updated = await this.repo.updateRestaurant(
        {
          scope,
          id: command.id,
          patch: normalizedPatch,
        },
        tx
      );

      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "system",
          action: "directory.restaurant.updated",
          entityType: "DirectoryRestaurant",
          entityId: updated.id,
          metadata: {
            slug: updated.slug,
            changedFields: Object.keys(normalizedPatch),
          },
        },
        tx
      );

      return UpdateAdminDirectoryRestaurantResponseSchema.parse({
        restaurant: toAdminDirectoryRestaurantDto(updated),
      });
    });

    return ok(response);
  }
}

const normalizePatch = (patch: UpdateAdminDirectoryRestaurantRequest) => ({
  ...(patch.slug !== undefined ? { slug: patch.slug.trim().toLowerCase() } : {}),
  ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
  ...(patch.shortDescription !== undefined
    ? { shortDescription: patch.shortDescription?.trim() || null }
    : {}),
  ...(patch.phone !== undefined ? { phone: patch.phone?.trim() || null } : {}),
  ...(patch.website !== undefined ? { website: patch.website?.trim() || null } : {}),
  ...(patch.priceRange !== undefined ? { priceRange: patch.priceRange } : {}),
  ...(patch.dishTags !== undefined
    ? { dishTags: patch.dishTags.map((tag) => tag.trim().toLowerCase()) }
    : {}),
  ...(patch.neighborhoodSlug !== undefined
    ? { neighborhoodSlug: patch.neighborhoodSlug?.trim().toLowerCase() || null }
    : {}),
  ...(patch.addressLine !== undefined ? { addressLine: patch.addressLine.trim() } : {}),
  ...(patch.postalCode !== undefined ? { postalCode: patch.postalCode.trim() } : {}),
  ...(patch.city !== undefined ? { city: patch.city.trim() } : {}),
  ...(patch.lat !== undefined ? { lat: patch.lat ?? null } : {}),
  ...(patch.lng !== undefined ? { lng: patch.lng ?? null } : {}),
  ...(patch.openingHoursJson !== undefined ? { openingHoursJson: patch.openingHoursJson } : {}),
  ...(patch.status !== undefined ? { status: patch.status } : {}),
});
