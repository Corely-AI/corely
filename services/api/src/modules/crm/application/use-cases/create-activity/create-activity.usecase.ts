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
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { CreateActivityInput, CreateActivityOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@RequireTenant()
@Injectable()
export class CreateActivityUseCase extends BaseUseCase<CreateActivityInput, CreateActivityOutput> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: CreateActivityInput): CreateActivityInput {
    if (!input.subject.trim()) {
      throw new ValidationError("Activity subject is required");
    }
    if (input.type === "COMMUNICATION" && !input.channelKey) {
      throw new ValidationError("Communication activity requires channelKey");
    }
    return input;
  }

  protected async handle(
    input: CreateActivityInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateActivityOutput, UseCaseError>> {
    const now = this.clock.now();
    const activity = ActivityEntity.create({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      type: input.type,
      subject: input.subject,
      body: input.body,
      channelKey: input.channelKey ?? null,
      direction:
        input.type === "COMMUNICATION"
          ? input.direction
          : (input.direction ??
            (input.messageDirection
              ? input.messageDirection.toUpperCase() === "INBOUND"
                ? "INBOUND"
                : "OUTBOUND"
              : null)),
      communicationStatus:
        input.type === "COMMUNICATION" ? (input.communicationStatus ?? "LOGGED") : null,
      messageDirection: input.direction
        ? input.direction.toLowerCase()
        : (input.messageDirection ?? null),
      messageTo: input.messageTo ?? null,
      openUrl: input.openUrl ?? null,
      partyId: input.partyId,
      dealId: input.dealId,
      activityDate: input.activityDate ? new Date(input.activityDate) : now,
      ownerId: input.assignedToUserId ?? ctx.userId ?? null,
      recordSource: input.recordSource ?? "MANUAL",
      recordSourceDetails: input.recordSourceDetails ?? null,
      toRecipients: input.to ?? null,
      ccRecipients: input.cc ?? null,
      participants: input.participants ?? null,
      threadKey: input.threadKey ?? null,
      externalThreadId: input.externalThreadId ?? null,
      externalMessageId: input.externalMessageId ?? null,
      providerKey: input.providerKey ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      rawProviderPayload: input.rawProviderPayload ?? null,
      attachments: input.attachments ?? null,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      assignedToUserId: input.assignedToUserId ?? ctx.userId ?? null,
      createdByUserId: ctx.userId ?? null,
      createdAt: now,
      outcome: input.outcome ?? null,
      durationSeconds: input.durationSeconds ?? null,
      location: input.location ?? null,
      attendees: input.attendees ?? null,
      metadata: input.metadata ?? null,
    });

    await this.activityRepo.create(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
