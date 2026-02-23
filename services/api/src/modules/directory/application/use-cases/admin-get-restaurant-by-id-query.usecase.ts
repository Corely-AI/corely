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
import {
  DIRECTORY_ERROR_CODES,
  type AdminDirectoryRestaurantDetailResponse,
} from "@corely/contracts";
import { toAdminDirectoryRestaurantDto } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

@RequireTenant()
export class AdminGetRestaurantByIdQueryUseCase extends BaseUseCase<
  { id: string },
  AdminDirectoryRestaurantDetailResponse
> {
  constructor(private readonly repo: DirectoryRepositoryPort) {
    super({});
  }

  protected async handle(
    input: { id: string },
    ctx: UseCaseContext
  ): Promise<Result<AdminDirectoryRestaurantDetailResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

    const restaurant = await this.repo.getRestaurantById(
      {
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
      },
      input.id
    );

    if (!restaurant) {
      return err(
        new NotFoundError(
          "Restaurant not found",
          { id: input.id },
          DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND
        )
      );
    }

    return ok({ restaurant: toAdminDirectoryRestaurantDto(restaurant) });
  }
}
