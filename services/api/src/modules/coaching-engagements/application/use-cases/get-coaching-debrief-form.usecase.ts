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
  type GetCoachingDebriefFormInput,
  type GetCoachingDebriefFormOutput,
} from "@corely/contracts";
import { resolveQuestionnaireTemplate } from "../../domain/coaching-localization";
import { hashCoachingAccessToken } from "../../domain/coaching-tokens";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class GetCoachingDebriefFormUseCase extends BaseUseCase<
  GetCoachingDebriefFormInput,
  GetCoachingDebriefFormOutput
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
    input: GetCoachingDebriefFormInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCoachingDebriefFormOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }
    const session = await this.deps.repo.findSessionByDebriefTokenHash(
      ctx.tenantId,
      input.sessionId,
      hashCoachingAccessToken(input.token)
    );
    if (!session || !session.engagement.offer.debriefTemplate) {
      return err(new ValidationError("Debrief form not available"));
    }

    return ok({
      questionnaire: resolveQuestionnaireTemplate({
        sessionId: session.id,
        engagementId: session.engagement.id,
        locale: session.engagement.locale,
        template: session.engagement.offer.debriefTemplate,
      }),
    });
  }
}
