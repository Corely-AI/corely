import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { SendCommunicationInput, SendCommunicationOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@RequireTenant()
@Injectable()
export class SendCommunicationUseCase extends BaseUseCase<
  SendCommunicationInput,
  SendCommunicationOutput
> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: SendCommunicationInput): SendCommunicationInput {
    if (!input.communicationId) {
      throw new ValidationError("communicationId is required");
    }
    return input;
  }

  protected async handle(
    input: SendCommunicationInput,
    ctx: UseCaseContext
  ): Promise<Result<SendCommunicationOutput, UseCaseError>> {
    const activity = await this.activityRepo.findById(ctx.tenantId, input.communicationId);
    if (!activity) {
      return err(new NotFoundError(`Communication ${input.communicationId} not found`));
    }
    if (activity.type !== "COMMUNICATION") {
      throw new ValidationError("Only COMMUNICATION activities can be sent");
    }

    const now = this.clock.now();
    activity.setCommunicationStatus("QUEUED", now, {
      providerKey: input.providerKey ?? activity.providerKey ?? null,
      externalMessageId: activity.externalMessageId ?? `msg_${this.idGenerator.newId()}`,
    });
    await this.activityRepo.update(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
