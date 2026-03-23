import {
  BaseUseCase,
  NotFoundError,
  ValidationError,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type GetCoachingOfferInput,
  type GetCoachingOfferOutput,
} from "@corely/contracts";
import { toCoachingOfferDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class GetCoachingOfferUseCase extends BaseUseCase<
  GetCoachingOfferInput,
  GetCoachingOfferOutput
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
    input: GetCoachingOfferInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCoachingOfferOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const offer = await this.deps.repo.findOfferById(ctx.tenantId, ctx.workspaceId, input.offerId);
    if (!offer) {
      return err(new NotFoundError("Coaching offer not found"));
    }

    return ok({ offer: toCoachingOfferDto(offer) });
  }
}
