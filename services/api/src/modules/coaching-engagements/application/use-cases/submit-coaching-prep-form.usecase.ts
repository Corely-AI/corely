import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  ValidationError,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type SubmitCoachingPrepFormInput,
  type SubmitCoachingPrepFormOutput,
  COACHING_EVENTS,
} from "@corely/contracts";
import { buildSimplePdf } from "../../domain/simple-pdf";
import { hashCoachingAccessToken } from "../../domain/coaching-tokens";
import { resolveGatedStatus } from "../../domain/coaching-state.machine";
import { type CoachingArtifactService } from "../../infrastructure/documents/coaching-artifact.service";
import { toCoachingSessionDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class SubmitCoachingPrepFormUseCase extends BaseUseCase<
  SubmitCoachingPrepFormInput,
  SubmitCoachingPrepFormOutput
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
      uow: UnitOfWorkPort;
    }
  ) {
    super({ logger: deps.logger, uow: deps.uow });
  }

  protected async handle(
    input: SubmitCoachingPrepFormInput,
    ctx: UseCaseContext
  ): Promise<Result<SubmitCoachingPrepFormOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }
    const session = await this.deps.repo.findSessionByPrepTokenHash(
      ctx.tenantId,
      input.sessionId,
      hashCoachingAccessToken(input.token)
    );
    if (!session) {
      return err(new ValidationError("Invalid prep form token"));
    }

    if (session.prepSubmittedAt && session.prepDocumentId) {
      return ok({ submitted: true, session: toCoachingSessionDto(session) });
    }

    const now = this.deps.clock.now();
    const document = await this.deps.artifactService.createPdfArtifact({
      tenantId: ctx.tenantId,
      title: `Coaching Prep Response ${session.id}`,
      objectPath: `engagements/${session.engagement.id}/sessions/${session.id}/prep`,
      links: [
        { entityType: "COACHING_ENGAGEMENT", entityId: session.engagement.id },
        { entityType: "COACHING_SESSION", entityId: session.id },
        { entityType: "PARTY", entityId: session.engagement.clientPartyId },
      ],
      bytes: buildSimplePdf([
        `Prep response for session ${session.id}`,
        `Submitted by: ${input.submittedByName ?? "Unknown"}`,
        `Submitted at: ${now.toISOString()}`,
        ...Object.entries(input.answers).map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
      ]),
    });

    const previousStatus = session.engagement.status;
    session.prepSubmittedAt = now;
    session.prepDocumentId = document.documentId;
    session.updatedAt = now;
    session.engagement.status = resolveGatedStatus(session.engagement.offer, {
      paymentStatus: session.engagement.paymentStatus,
      contractStatus: session.engagement.contractStatus,
      prepRequired: true,
      prepSubmitted: true,
    });
    session.engagement.updatedAt = now;

    await this.uow!.withinTransaction(async (tx) => {
      await this.deps.repo.updateSession(session, tx);
      await this.deps.repo.updateEngagement(session.engagement, tx);
      await this.deps.repo.createTimelineEntry(
        {
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId!,
          workspaceId: ctx.workspaceId!,
          engagementId: session.engagement.id,
          eventType: COACHING_EVENTS.PREP_FORM_SUBMITTED,
          stateFrom: previousStatus,
          stateTo: session.engagement.status,
          actorUserId: null,
          metadata: { sessionId: session.id, documentId: document.documentId },
          occurredAt: now,
          createdAt: now,
        },
        tx
      );
      await this.deps.audit.log(
        {
          tenantId: ctx.tenantId!,
          userId: "public",
          action: "coaching.prep.submitted",
          entityType: "CoachingSession",
          entityId: session.id,
          metadata: { documentId: document.documentId },
        },
        tx
      );
      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: COACHING_EVENTS.PREP_FORM_SUBMITTED,
          correlationId: ctx.correlationId,
          payload: {
            workspaceId: ctx.workspaceId!,
            engagementId: session.engagement.id,
            sessionId: session.id,
            documentId: document.documentId,
          },
        },
        tx
      );
    });

    return ok({ submitted: true, session: toCoachingSessionDto(session) });
  }
}
