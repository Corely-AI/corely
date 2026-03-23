import {
  BaseUseCase,
  ValidationError,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type GetCoachingContractViewInput,
  type GetCoachingContractViewOutput,
} from "@corely/contracts";
import { hashCoachingAccessToken } from "../../domain/coaching-tokens";
import {
  toCoachingContractRequestDto,
  toCoachingEngagementDto,
} from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class GetCoachingContractViewUseCase extends BaseUseCase<
  GetCoachingContractViewInput,
  GetCoachingContractViewOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      clock: ClockPort;
    }
  ) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetCoachingContractViewInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCoachingContractViewOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const request = await this.deps.repo.findContractRequestByTokenHash(
      ctx.tenantId,
      input.engagementId,
      hashCoachingAccessToken(input.token)
    );
    if (!request) {
      return err(new ValidationError("Invalid contract access token"));
    }

    const engagement = await this.deps.repo.findEngagementById(
      ctx.tenantId,
      ctx.workspaceId,
      input.engagementId
    );
    if (!engagement) {
      return err(new ValidationError("Engagement not found"));
    }

    let nextRequest = request;
    if (!request.viewedAt) {
      const now = this.deps.clock.now();
      nextRequest = await this.deps.repo.updateContractRequest({
        ...request,
        status: request.status === "pending" ? "viewed" : request.status,
        viewedAt: now,
        updatedAt: now,
      });
    }

    return ok({
      request: toCoachingContractRequestDto(nextRequest),
      engagement: toCoachingEngagementDto(engagement, engagement.offer),
      contractBody: nextRequest.contractBody,
    });
  }
}
