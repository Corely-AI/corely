import {
  BaseUseCase,
  ValidationError,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import { type ListCoachingSessionsInput, type ListCoachingSessionsOutput } from "@corely/contracts";
import { toCoachingSessionDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class ListCoachingSessionsUseCase extends BaseUseCase<
  ListCoachingSessionsInput,
  ListCoachingSessionsOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListCoachingSessionsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCoachingSessionsOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const result = await this.deps.repo.listSessions(
      ctx.tenantId,
      ctx.workspaceId,
      {
        engagementId: input.engagementId,
        status: input.status,
      },
      { page: input.page, pageSize: input.pageSize }
    );

    return ok({
      items: result.items.map(toCoachingSessionDto),
      pageInfo: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        hasNextPage: input.page * input.pageSize < result.total,
      },
    });
  }
}
