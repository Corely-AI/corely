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
  type GetCoachingArtifactSummaryInput,
  type GetCoachingArtifactSummaryOutput,
} from "@corely/contracts";
import { type DocumentsApplication } from "../../../documents/application/documents.application";
import { canManageEngagement } from "../../domain/coaching-state.machine";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class GetCoachingArtifactSummaryUseCase extends BaseUseCase<
  GetCoachingArtifactSummaryInput,
  GetCoachingArtifactSummaryOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      documents: DocumentsApplication;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetCoachingArtifactSummaryInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCoachingArtifactSummaryOutput, UseCaseError>> {
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
      return err(new ForbiddenError("Not authorized to summarize this engagement"));
    }

    const sessions = await this.deps.repo.listSessions(
      ctx.tenantId,
      ctx.workspaceId,
      { engagementId: engagement.id },
      { page: 1, pageSize: 50 }
    );

    const engagementDocs = await this.deps.documents.listLinkedDocuments.execute(
      { entityType: "COACHING_ENGAGEMENT", entityId: engagement.id },
      ctx
    );
    if (isErr(engagementDocs)) {
      return engagementDocs;
    }

    const sessionDocs = await Promise.all(
      sessions.items.map((session) =>
        this.deps.documents.listLinkedDocuments.execute(
          { entityType: "COACHING_SESSION", entityId: session.id },
          ctx
        )
      )
    );

    const titles = [
      ...engagementDocs.value.items.map((item) => item.title ?? item.type),
      ...sessionDocs.flatMap((result) =>
        isErr(result) ? [] : result.value.items.map((item) => item.title ?? item.type)
      ),
    ];

    const summary = [
      `Engagement ${engagement.id} is ${engagement.status}.`,
      `Payment is ${engagement.paymentStatus}; contract is ${engagement.contractStatus}.`,
      `There are ${sessions.items.length} coaching session(s) linked to this engagement.`,
      titles.length > 0 ? `Artifacts: ${titles.join(", ")}.` : "No stored artifacts yet.",
      engagement.latestSummary ? `Latest coaching summary: ${engagement.latestSummary}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return ok({ summary });
  }
}
