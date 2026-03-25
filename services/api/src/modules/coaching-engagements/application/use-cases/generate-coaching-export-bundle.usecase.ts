import {
  AUDIT_PORT,
  BaseUseCase,
  IDEMPOTENCY_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  ForbiddenError,
  ValidationError,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type IdempotencyPort,
  type LoggerPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  buildIdempotencyKey,
  err,
  ok,
} from "@corely/kernel";
import {
  type GenerateCoachingExportBundleInput,
  type GenerateCoachingExportBundleOutput,
  COACHING_EVENTS,
} from "@corely/contracts";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class GenerateCoachingExportBundleUseCase extends BaseUseCase<
  GenerateCoachingExportBundleInput,
  GenerateCoachingExportBundleOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      idGenerator: IdGeneratorPort;
      clock: ClockPort;
      audit: AuditPort;
      outbox: OutboxPort;
      idempotency: IdempotencyPort;
      uow: UnitOfWorkPort;
    }
  ) {
    super({ logger: deps.logger, idempotency: deps.idempotency, uow: deps.uow });
  }

  protected getIdempotencyKey(
    input: GenerateCoachingExportBundleInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.workspaceId) {
      return undefined;
    }
    return buildIdempotencyKey("coaching/export", ctx.workspaceId, input.idempotencyKey);
  }

  protected async handle(
    input: GenerateCoachingExportBundleInput,
    ctx: UseCaseContext
  ): Promise<Result<GenerateCoachingExportBundleOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      return err(new ValidationError("tenantId, workspaceId, and userId are required"));
    }
    const engagement = await this.deps.repo.findEngagementById(
      ctx.tenantId,
      ctx.workspaceId,
      input.engagementId
    );
    if (!engagement) {
      return err(new ValidationError("Engagement not found"));
    }
    if (!canManageEngagement(engagement, { userId: ctx.userId, roles: ctx.roles })) {
      return err(new ForbiddenError("Not authorized to export this engagement"));
    }

    const existing = await this.deps.repo.findLatestArtifactBundle(ctx.tenantId, engagement.id);
    if (existing?.status === "ready" && existing.documentId) {
      return ok({ documentId: existing.documentId, status: "ready" });
    }

    const now = this.deps.clock.now();
    const bundle = existing ?? {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      engagementId: engagement.id,
      status: "pending" as const,
      documentId: null,
      requestedByUserId: ctx.userId,
      requestedAt: now,
      completedAt: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.uow!.withinTransaction(async (tx) => {
      if (existing) {
        existing.status = "pending";
        existing.updatedAt = now;
        existing.errorMessage = null;
        await this.deps.repo.updateArtifactBundle(existing, tx);
      } else {
        await this.deps.repo.createArtifactBundle(bundle, tx);
      }
      await this.deps.audit.log(
        {
          tenantId: ctx.tenantId!,
          userId: ctx.userId!,
          action: "coaching.export.request",
          entityType: "CoachingEngagement",
          entityId: engagement.id,
        },
        tx
      );
      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: COACHING_EVENTS.EXPORT_BUNDLE_REQUESTED,
          correlationId: ctx.correlationId,
          payload: {
            workspaceId: ctx.workspaceId!,
            engagementId: engagement.id,
            requestedByUserId: ctx.userId!,
          },
        },
        tx
      );
    });

    return ok({
      documentId: existing?.documentId ?? "",
      status: "pending",
    });
  }
}
