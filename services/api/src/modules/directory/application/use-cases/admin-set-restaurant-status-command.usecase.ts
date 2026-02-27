import {
  BaseUseCase,
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
  SetRestaurantStatusResponseSchema,
  type SetRestaurantStatusResponse,
} from "@corely/contracts";
import { toAdminDirectoryRestaurantDto } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

type AdminSetRestaurantStatusCommand = {
  id: string;
  status: "ACTIVE" | "HIDDEN";
};

@RequireTenant()
export class AdminSetRestaurantStatusCommandUseCase extends BaseUseCase<
  AdminSetRestaurantStatusCommand,
  SetRestaurantStatusResponse
> {
  constructor(
    private readonly repo: DirectoryRepositoryPort,
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly audit: AuditPort
  ) {
    super({});
  }

  protected async handle(
    command: AdminSetRestaurantStatusCommand,
    ctx: UseCaseContext
  ): Promise<Result<SetRestaurantStatusResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

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

      const updated =
        existing.status === command.status
          ? existing
          : await this.repo.updateRestaurant(
              {
                scope,
                id: command.id,
                patch: { status: command.status },
              },
              tx
            );

      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId: ctx.userId ?? "system",
          action: "directory.restaurant.status.changed",
          entityType: "DirectoryRestaurant",
          entityId: updated.id,
          metadata: {
            from: existing.status,
            to: updated.status,
          },
        },
        tx
      );

      return SetRestaurantStatusResponseSchema.parse({
        restaurant: toAdminDirectoryRestaurantDto(updated),
      });
    });

    return ok(response);
  }
}
