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
import { type ListCoachingOffersInput, type ListCoachingOffersOutput } from "@corely/contracts";
import { toCoachingOfferDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class ListCoachingOffersUseCase extends BaseUseCase<
  ListCoachingOffersInput,
  ListCoachingOffersOutput
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
    input: ListCoachingOffersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCoachingOffersOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const result = await this.deps.repo.listOffers(
      ctx.tenantId,
      ctx.workspaceId,
      {
        q: input.q,
        includeArchived: input.includeArchived,
      },
      { page: input.page, pageSize: input.pageSize }
    );

    return ok({
      items: result.items.map(toCoachingOfferDto),
      pageInfo: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        hasNextPage: input.page * input.pageSize < result.total,
      },
    });
  }
}
