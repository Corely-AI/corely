import { createHash } from "node:crypto";
import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  RequireTenant,
  ValidationError,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  CreateDirectoryLeadResponseSchema,
  DIRECTORY_ERROR_CODES,
  DIRECTORY_EVENT_TYPES,
  DirectoryLeadCreatedEventSchema,
  type CreateDirectoryLeadRequest,
  type CreateDirectoryLeadResponse,
} from "@corely/contracts";
import { IdempotencyService } from "@/shared/infrastructure/idempotency/idempotency.service";
import type { DirectoryRepositoryPort } from "../ports/directory-repository.port";

const ACTION_KEY = "directory.create-lead";
type LeadIdempotencyPort = Pick<IdempotencyService, "startOrReplay" | "complete" | "fail">;

type CreateLeadCommand = {
  input: CreateDirectoryLeadRequest;
  idempotencyKey: string;
};

@RequireTenant()
export class CreateLeadCommandUseCase extends BaseUseCase<
  CreateLeadCommand,
  CreateDirectoryLeadResponse
> {
  constructor(
    private readonly repo: DirectoryRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly idempotencyService: LeadIdempotencyPort
  ) {
    super({});
  }

  protected async handle(
    command: CreateLeadCommand,
    ctx: UseCaseContext
  ): Promise<Result<CreateDirectoryLeadResponse, UseCaseError>> {
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

    const normalizedInput = normalizeInput(command.input);
    const requestHash = hashForIdempotency(normalizedInput);

    const idempotency = await this.idempotencyService.startOrReplay({
      actionKey: ACTION_KEY,
      tenantId: ctx.tenantId,
      idempotencyKey: command.idempotencyKey,
      requestHash,
      userId: ctx.userId,
    });

    if (idempotency.mode === "REPLAY") {
      return ok(CreateDirectoryLeadResponseSchema.parse(idempotency.responseBody));
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
        const restaurant = await this.repo.findRestaurantForLead(
          {
            tenantId: ctx.tenantId!,
            workspaceId: ctx.workspaceId!,
          },
          {
            restaurantId: normalizedInput.restaurantId,
            restaurantSlug: normalizedInput.restaurantSlug,
          },
          tx
        );

        if (!restaurant || restaurant.status !== "ACTIVE") {
          throw new NotFoundError(
            "Restaurant not found",
            {
              restaurantId: normalizedInput.restaurantId,
              restaurantSlug: normalizedInput.restaurantSlug,
            },
            DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND
          );
        }

        const lead = await this.repo.createLead(
          {
            scope: {
              tenantId: ctx.tenantId!,
              workspaceId: ctx.workspaceId!,
            },
            restaurantId: restaurant.id,
            name: normalizedInput.name,
            contact: normalizedInput.contact,
            message: normalizedInput.message,
          },
          tx
        );

        const eventPayload = DirectoryLeadCreatedEventSchema.parse({
          leadId: lead.id,
          tenantId: lead.tenantId,
          workspaceId: lead.workspaceId,
          restaurantId: restaurant.id,
          restaurantSlug: restaurant.slug,
          restaurantName: restaurant.name,
          name: lead.name,
          contact: lead.contact,
          message: lead.message,
          createdAt: lead.createdAt.toISOString(),
        });

        await this.outbox.enqueue(
          {
            tenantId: ctx.tenantId!,
            eventType: DIRECTORY_EVENT_TYPES.LEAD_CREATED,
            payload: eventPayload,
            correlationId: ctx.correlationId ?? lead.id,
          },
          tx
        );

        return { leadId: lead.id };
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
            code: "Directory:CreateLeadFailed",
            message: error instanceof Error ? error.message : "Failed to create lead",
          },
        })
        .catch(() => undefined);

      throw error;
    }
  }
}

const normalizeInput = (input: CreateDirectoryLeadRequest) => ({
  restaurantId: input.restaurantId?.trim() || undefined,
  restaurantSlug: input.restaurantSlug?.trim().toLowerCase() || undefined,
  name: input.name.trim(),
  contact: input.contact.trim(),
  message: input.message.trim(),
});

const hashForIdempotency = (input: ReturnType<typeof normalizeInput>): string => {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
};
