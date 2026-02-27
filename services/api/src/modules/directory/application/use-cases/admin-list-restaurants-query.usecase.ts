import {
  BaseUseCase,
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
  type AdminDirectoryRestaurantListQuery,
  type AdminDirectoryRestaurantListResponse,
} from "@corely/contracts";
import { buildPageInfo } from "@/shared/http/pagination";
import { toAdminDirectoryRestaurantListItem } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

@RequireTenant()
export class AdminListRestaurantsQueryUseCase extends BaseUseCase<
  AdminDirectoryRestaurantListQuery,
  AdminDirectoryRestaurantListResponse
> {
  constructor(private readonly repo: DirectoryRepositoryPort) {
    super({});
  }

  protected async handle(
    input: AdminDirectoryRestaurantListQuery,
    ctx: UseCaseContext
  ): Promise<Result<AdminDirectoryRestaurantListResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

    const listResult = await this.repo.listAdminRestaurants(
      {
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
      },
      input
    );

    return ok({
      items: listResult.items.map(toAdminDirectoryRestaurantListItem),
      pageInfo: buildPageInfo(listResult.total, input.page, input.pageSize),
    });
  }
}
