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
import {
  type ListCoachingEngagementsInput,
  type ListCoachingEngagementsOutput,
} from "@corely/contracts";
import { toCoachingEngagementDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class ListCoachingEngagementsUseCase extends BaseUseCase<
  ListCoachingEngagementsInput,
  ListCoachingEngagementsOutput
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
    input: ListCoachingEngagementsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCoachingEngagementsOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const result = await this.deps.repo.listEngagements(
      ctx.tenantId,
      ctx.workspaceId,
      {
        q: input.q,
        status: input.status,
        coachUserId: input.coachUserId,
        clientPartyId: input.clientPartyId,
      },
      { page: input.page, pageSize: input.pageSize }
    );

    return ok({
      items: result.items.map((item) => toCoachingEngagementDto(item, item.offer)),
      pageInfo: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        hasNextPage: input.page * input.pageSize < result.total,
      },
    });
  }
}
