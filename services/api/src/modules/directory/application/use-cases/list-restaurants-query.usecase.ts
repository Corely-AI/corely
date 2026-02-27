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
  type DirectoryRestaurantListQuery,
  type DirectoryRestaurantListResponse,
  DIRECTORY_ERROR_CODES,
} from "@corely/contracts";
import { buildPageInfo } from "@/shared/http/pagination";
import { toDirectoryRestaurantListItem } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

@RequireTenant()
export class ListRestaurantsQueryUseCase extends BaseUseCase<
  DirectoryRestaurantListQuery,
  DirectoryRestaurantListResponse
> {
  constructor(private readonly repo: DirectoryRepositoryPort) {
    super({});
  }

  protected async handle(
    input: DirectoryRestaurantListQuery,
    ctx: UseCaseContext
  ): Promise<Result<DirectoryRestaurantListResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

    const listResult = await this.repo.listRestaurants(
      {
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
      },
      input
    );

    return ok({
      items: listResult.items.map(toDirectoryRestaurantListItem),
      pageInfo: buildPageInfo(listResult.total, input.page, input.pageSize),
    });
  }
}
