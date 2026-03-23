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
  type CompleteCoachingSessionInput,
  type CompleteCoachingSessionOutput,
  COACHING_EVENTS,
} from "@corely/contracts";
import { buildSimplePdf } from "../../domain/simple-pdf";
import { canManageEngagement, resolvePostSessionStatus } from "../../domain/coaching-state.machine";
import { type CoachingArtifactService } from "../../infrastructure/documents/coaching-artifact.service";
import { toCoachingEngagementDto, toCoachingSessionDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class CompleteCoachingSessionUseCase extends BaseUseCase<
  CompleteCoachingSessionInput,
  CompleteCoachingSessionOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      artifactService: CoachingArtifactService;
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
    input: CompleteCoachingSessionInput,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey || !ctx.workspaceId) {
      return undefined;
    }
    return buildIdempotencyKey("coaching/session-complete", ctx.workspaceId, input.idempotencyKey);
  }

  protected async handle(
    input: CompleteCoachingSessionInput,
    ctx: UseCaseContext
  ): Promise<Result<CompleteCoachingSessionOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }
    const session = await this.deps.repo.findSessionById(
      ctx.tenantId,
      ctx.workspaceId,
      input.sessionId
    );
    if (!session) {
      return err(new ValidationError("Session not found"));
    }
    if (!canManageEngagement(session.engagement, { userId: ctx.userId, roles: ctx.roles })) {
      return err(new ForbiddenError("Not authorized to complete this session"));
    }

    const now = this.deps.clock.now();
    const previousStatus = session.engagement.status;
    session.status = "completed";
    session.completedAt = now;
    session.updatedAt = now;
    session.engagement.status = resolvePostSessionStatus(session.engagement.offer);
    session.engagement.updatedAt = now;

    if (input.notes) {
      await this.deps.artifactService.createPdfArtifact({
        tenantId: ctx.tenantId,
        title: `Coaching Session Notes ${session.id}`,
        objectPath: `engagements/${session.engagement.id}/sessions/${session.id}/notes`,
        links: [
          { entityType: "COACHING_ENGAGEMENT", entityId: session.engagement.id },
          { entityType: "COACHING_SESSION", entityId: session.id },
        ],
        bytes: buildSimplePdf([
          `Session notes for ${session.id}`,
          `Created at: ${now.toISOString()}`,
          input.notes,
        ]),
      });
      session.engagement.latestSummary = input.notes;
      session.engagement.updatedAt = now;
    }

    await this.uow!.withinTransaction(async (tx) => {
      await this.deps.repo.updateSession(session, tx);
      await this.deps.repo.updateEngagement(session.engagement, tx);
      await this.deps.repo.createTimelineEntry(
        {
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId!,
          workspaceId: ctx.workspaceId!,
          engagementId: session.engagement.id,
          eventType: COACHING_EVENTS.SESSION_COMPLETED,
          stateFrom: previousStatus,
          stateTo: session.engagement.status,
          actorUserId: ctx.userId ?? null,
          metadata: { sessionId: session.id },
          occurredAt: now,
          createdAt: now,
        },
        tx
      );
      await this.deps.audit.log(
        {
          tenantId: ctx.tenantId!,
          userId: ctx.userId ?? "system",
          action: "coaching.session.complete",
          entityType: "CoachingSession",
          entityId: session.id,
          metadata: { engagementId: session.engagement.id },
        },
        tx
      );
      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: COACHING_EVENTS.SESSION_COMPLETED,
          correlationId: ctx.correlationId,
          payload: {
            workspaceId: ctx.workspaceId!,
            engagementId: session.engagement.id,
            sessionId: session.id,
          },
        },
        tx
      );
    });

    return ok({
      session: toCoachingSessionDto(session),
      engagement: toCoachingEngagementDto(session.engagement, session.engagement.offer),
    });
  }
}
