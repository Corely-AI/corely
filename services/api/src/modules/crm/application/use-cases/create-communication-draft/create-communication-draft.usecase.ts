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
} from "@corely/kernel";
import type {
  CreateCommunicationDraftInput,
  CreateCommunicationDraftOutput,
} from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { toActivityDto } from "../../mappers/activity-dto.mapper";

@RequireTenant()
@Injectable()
export class CreateCommunicationDraftUseCase extends BaseUseCase<
  CreateCommunicationDraftInput,
  CreateCommunicationDraftOutput
> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: CreateCommunicationDraftInput): CreateCommunicationDraftInput {
    if (!input.channelKey) {
      throw new ValidationError("channelKey is required");
    }
    if (!input.dealId && !input.partyId) {
      throw new ValidationError("Communication draft must be linked to a deal or party");
    }
    return input;
  }

  protected async handle(
    input: CreateCommunicationDraftInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateCommunicationDraftOutput, UseCaseError>> {
    const now = this.clock.now();
    const activity = ActivityEntity.create({
      id: this.idGenerator.newId(),
      tenantId: ctx.tenantId,
      type: "COMMUNICATION",
      subject: input.subject?.trim() || `${input.channelKey} draft`,
      body: input.body ?? null,
      channelKey: input.channelKey,
      direction: "OUTBOUND",
      communicationStatus: "DRAFT",
      partyId: input.partyId ?? null,
      dealId: input.dealId ?? null,
      activityDate: input.activityDate ? new Date(input.activityDate) : now,
      ownerId: ctx.userId ?? null,
      recordSource: input.recordSource ?? "MANUAL",
      recordSourceDetails: input.recordSourceDetails ?? null,
      toRecipients: input.to ?? null,
      ccRecipients: input.cc ?? null,
      participants: input.participants ?? null,
      threadKey: input.threadKey ?? null,
      externalThreadId: input.externalThreadId ?? null,
      externalMessageId: input.externalMessageId ?? null,
      providerKey: input.providerKey ?? null,
      attachments: input.attachments ?? null,
      metadata: input.metadata ?? null,
      assignedToUserId: ctx.userId ?? null,
      createdByUserId: ctx.userId ?? null,
      createdAt: now,
    });

    await this.activityRepo.create(ctx.tenantId, activity);

    return ok({ activity: toActivityDto(activity) });
  }
}
