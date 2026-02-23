import { createHash } from "node:crypto";
import {
  BaseUseCase,
  ConflictError,
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
  CreateAdminDirectoryRestaurantResponseSchema,
  DIRECTORY_ERROR_CODES,
  type CreateAdminDirectoryRestaurantRequest,
  type CreateAdminDirectoryRestaurantResponse,
} from "@corely/contracts";
import { IdempotencyService } from "@/shared/infrastructure/idempotency/idempotency.service";
import { toAdminDirectoryRestaurantDto } from "../directory.mapper";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

const ACTION_KEY = "directory.admin.create-restaurant";
type RestaurantIdempotencyPort = Pick<IdempotencyService, "startOrReplay" | "complete" | "fail">;

type AdminCreateRestaurantCommand = {
  input: CreateAdminDirectoryRestaurantRequest;
  idempotencyKey: string;
};

@RequireTenant()
export class AdminCreateRestaurantCommandUseCase extends BaseUseCase<
  AdminCreateRestaurantCommand,
  CreateAdminDirectoryRestaurantResponse
> {
  constructor(
    private readonly repo: DirectoryRepositoryPort,
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly idempotencyService: RestaurantIdempotencyPort,
    private readonly audit: AuditPort
  ) {
    super({});
  }

  protected async handle(
    command: AdminCreateRestaurantCommand,
    ctx: UseCaseContext
  ): Promise<Result<CreateAdminDirectoryRestaurantResponse, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(
        new ValidationError(
          "tenant/workspace scope is required",
          { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId },
          DIRECTORY_ERROR_CODES.TENANT_SCOPE_REQUIRED
        )
      );
    }

    if (!command.idempotencyKey?.trim()) {
      return err(
        new ValidationError(
          "Idempotency-Key header is required",
          undefined,
          DIRECTORY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED
        )
      );
    }

    const normalizedInput = normalizeCreateInput(command.input);
    const requestHash = createHash("sha256").update(JSON.stringify(normalizedInput)).digest("hex");

    const idempotency = await this.idempotencyService.startOrReplay({
      actionKey: ACTION_KEY,
      tenantId: ctx.tenantId,
      idempotencyKey: command.idempotencyKey,
      requestHash,
      userId: ctx.userId,
    });

    if (idempotency.mode === "REPLAY") {
      return ok(CreateAdminDirectoryRestaurantResponseSchema.parse(idempotency.responseBody));
    }

    if (idempotency.mode === "FAILED") {
      return err(
        new ConflictError(
          "A previous request with this Idempotency-Key failed",
          { status: idempotency.responseStatus },
          DIRECTORY_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS
        )
      );
    }

    if (idempotency.mode === "IN_PROGRESS") {
      return err(
        new ConflictError(
          "A request with this Idempotency-Key is still in progress",
          { retryAfterMs: idempotency.retryAfterMs ?? 1000 },
          DIRECTORY_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS
        )
      );
    }

    if (idempotency.mode === "MISMATCH") {
      return err(
        new ConflictError(
          "Idempotency-Key was already used with a different payload",
          undefined,
          DIRECTORY_ERROR_CODES.IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
        )
      );
    }

    try {
      const response = await this.unitOfWork.withinTransaction(async (tx) => {
        const scope = {
          tenantId: ctx.tenantId!,
          workspaceId: ctx.workspaceId!,
        };

        const existing = await this.repo.findRestaurantBySlug(scope, normalizedInput.slug, tx);
        if (existing) {
          throw new ConflictError(
            "Restaurant slug already exists",
            { slug: normalizedInput.slug },
            DIRECTORY_ERROR_CODES.SLUG_ALREADY_EXISTS
          );
        }

        const restaurant = await this.repo.createRestaurant(
          {
            scope,
            ...normalizedInput,
          },
          tx
        );

        await this.audit.log(
          {
            tenantId: scope.tenantId,
            userId: ctx.userId ?? "system",
            action: "directory.restaurant.created",
            entityType: "DirectoryRestaurant",
            entityId: restaurant.id,
            metadata: {
              slug: restaurant.slug,
              status: restaurant.status,
            },
          },
          tx
        );

        return CreateAdminDirectoryRestaurantResponseSchema.parse({
          restaurant: toAdminDirectoryRestaurantDto(restaurant),
        });
      });

      await this.idempotencyService.complete({
        actionKey: ACTION_KEY,
        tenantId: ctx.tenantId,
        idempotencyKey: command.idempotencyKey,
        responseStatus: 201,
        responseBody: response,
      });

      return ok(response);
    } catch (error) {
      await this.idempotencyService
        .fail({
          actionKey: ACTION_KEY,
          tenantId: ctx.tenantId,
          idempotencyKey: command.idempotencyKey,
          responseStatus: 500,
          responseBody: {
            code: "Directory:CreateRestaurantFailed",
            message: error instanceof Error ? error.message : "Failed to create restaurant",
          },
        })
        .catch(() => undefined);

      throw error;
    }
  }
}

const normalizeCreateInput = (input: CreateAdminDirectoryRestaurantRequest) => ({
  slug: input.slug.trim().toLowerCase(),
  name: input.name.trim(),
  shortDescription: input.shortDescription?.trim() || null,
  phone: input.phone?.trim() || null,
  website: input.website?.trim() || null,
  priceRange: input.priceRange ?? null,
  dishTags: input.dishTags.map((tag) => tag.trim().toLowerCase()),
  neighborhoodSlug: input.neighborhoodSlug?.trim().toLowerCase() || null,
  addressLine: input.addressLine.trim(),
  postalCode: input.postalCode.trim(),
  city: input.city?.trim() || "Berlin",
  lat: input.lat ?? null,
  lng: input.lng ?? null,
  openingHoursJson: input.openingHoursJson ?? null,
  status: input.status,
});
