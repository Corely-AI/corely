import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
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
import type { UpdateActivityInput, UpdateActivityOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@RequireTenant()
@Injectable()
export class UpdateActivityUseCase extends BaseUseCase<UpdateActivityInput, UpdateActivityOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: UpdateActivityInput): UpdateActivityInput {
    if (!input.activityId) {
      throw new ValidationError("activityId is required");
    }
    if (input.subject !== undefined && !input.subject.trim()) {
      throw new ValidationError("Activity subject cannot be empty");
    }
    return input;
  }

  protected async handle(
    input: UpdateActivityInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateActivityOutput, UseCaseError>> {
    const activity = await this.activityRepo.findById(ctx.tenantId, input.activityId);
    if (!activity) {
      return err(new NotFoundError(`Activity ${input.activityId} not found`));
    }

    const now = this.clock.now();
    activity.updateActivity(
      {
        subject: input.subject,
        body: input.body,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        assignedToUserId: input.assignedToUserId,
        outcome: input.outcome,
        durationSeconds: input.durationSeconds,
        location: input.location,
        attendees: input.attendees ?? undefined,
        channelKey: input.channelKey ?? undefined,
        direction: input.direction ?? undefined,
        communicationStatus: input.communicationStatus ?? undefined,
        toRecipients: input.to ?? undefined,
        ccRecipients: input.cc ?? undefined,
        participants: input.participants ?? undefined,
        threadKey: input.threadKey ?? undefined,
        externalThreadId: input.externalThreadId ?? undefined,
        externalMessageId: input.externalMessageId ?? undefined,
        providerKey: input.providerKey ?? undefined,
        errorCode: input.errorCode ?? undefined,
        errorMessage: input.errorMessage ?? undefined,
        rawProviderPayload: input.rawProviderPayload ?? undefined,
        activityDate: input.activityDate ? new Date(input.activityDate) : undefined,
        metadata: input.metadata ?? undefined,
      },
      now
    );

    await this.activityRepo.update(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
