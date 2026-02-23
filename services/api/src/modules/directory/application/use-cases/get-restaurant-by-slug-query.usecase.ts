import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  ValidationError,
  err,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import { DIRECTORY_ERROR_CODES, type DirectoryRestaurantDetailResponse } from "@corely/contracts";
import { toDirectoryRestaurantDto } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

@RequireTenant()
export class GetRestaurantBySlugQueryUseCase extends BaseUseCase<
  { slug: string },
  DirectoryRestaurantDetailResponse
> {
  constructor(private readonly repo: DirectoryRepositoryPort) {
    super({});
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<DirectoryRestaurantDetailResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

    const restaurant = await this.repo.getRestaurantBySlug(
      {
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
      },
      input.slug
    );

    if (!restaurant) {
      return err(
        new NotFoundError(
          "Restaurant not found",
          { slug: input.slug },
          DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND
        )
      );
    }

    return ok({ restaurant: toDirectoryRestaurantDto(restaurant) });
  }
}
