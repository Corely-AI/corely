import {
  BaseUseCase,
  ForbiddenError,
  ValidationError,
  isErr,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type GetCoachingEngagementInput,
  type GetCoachingEngagementOutput,
} from "@corely/contracts";
import { type DocumentsApplication } from "../../../documents/application/documents.application";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { toCoachingArtifactDto, toCoachingDetailDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import { type GetCoachingArtifactSummaryUseCase } from "./get-coaching-artifact-summary.usecase";

export class GetCoachingEngagementUseCase extends BaseUseCase<
  GetCoachingEngagementInput,
  GetCoachingEngagementOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      documents: DocumentsApplication;
      summary: GetCoachingArtifactSummaryUseCase;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetCoachingEngagementInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCoachingEngagementOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
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
      return err(new ForbiddenError("Not authorized to access this engagement"));
    }

    const sessions = await this.deps.repo.listSessions(
      ctx.tenantId,
      ctx.workspaceId,
      { engagementId: engagement.id },
      { page: 1, pageSize: 50 }
    );
    const timeline = await this.deps.repo.listTimeline(ctx.tenantId, engagement.id);
    const bundle = await this.deps.repo.findLatestArtifactBundle(ctx.tenantId, engagement.id);

    const engagementDocuments = await this.deps.documents.listLinkedDocuments.execute(
      { entityType: "COACHING_ENGAGEMENT", entityId: engagement.id },
      ctx
    );
    if (isErr(engagementDocuments)) {
      return engagementDocuments;
    }

    const sessionDocuments = await Promise.all(
      sessions.items.map(async (session) => {
        const result = await this.deps.documents.listLinkedDocuments.execute(
          { entityType: "COACHING_SESSION", entityId: session.id },
          ctx
        );
        if (isErr(result)) {
          return [];
        }
        return result.value.items.map((document) =>
          toCoachingArtifactDto({ document, entityType: "session", entityId: session.id })
        );
      })
    );

    const summary = await this.deps.summary.execute({ engagementId: engagement.id }, ctx);
    if (isErr(summary)) {
      return summary;
    }

    return ok(
      toCoachingDetailDto({
        engagement,
        offer: engagement.offer,
        sessions: sessions.items,
        timeline,
        artifacts: [
          ...engagementDocuments.value.items.map((document) =>
            toCoachingArtifactDto({
              document,
              entityType: "engagement",
              entityId: engagement.id,
            })
          ),
          ...sessionDocuments.flat(),
        ],
        aiSummary: summary.value.summary,
        exportedBundleDocumentId: bundle?.documentId ?? null,
      })
    );
  }
}
