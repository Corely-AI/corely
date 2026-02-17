import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type ClockPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import type { CommunicationWebhookInput, CommunicationWebhookOutput } from "@corely/contracts";
import type { ActivityRepoPort } from "../../ports/activity-repository.port";

@RequireTenant()
@Injectable()
export class ProcessCommunicationWebhookUseCase extends BaseUseCase<
  CommunicationWebhookInput,
  CommunicationWebhookOutput
> {
  constructor(
    private readonly activityRepo: ActivityRepoPort,
    private readonly clock: ClockPort,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: CommunicationWebhookInput): CommunicationWebhookInput {
    if (!input.providerKey) {
      throw new ValidationError("providerKey is required");
    }
    if (!input.channelKey) {
      throw new ValidationError("channelKey is required");
    }
    if (!input.externalMessageId) {
      throw new ValidationError("externalMessageId is required");
    }
    return input;
  }

  protected async handle(
    input: CommunicationWebhookInput,
    ctx: UseCaseContext
  ): Promise<Result<CommunicationWebhookOutput, UseCaseError>> {
    const now = this.clock.now();
    const activity = await this.activityRepo.findCommunicationByExternalMessageId(
      ctx.tenantId,
      input.providerKey,
      input.externalMessageId
    );

    const inserted = await this.activityRepo.upsertWebhookEvent({
      tenantId: ctx.tenantId,
      providerKey: input.providerKey,
      channelKey: input.channelKey,
      externalMessageId: input.externalMessageId,
      eventType: input.eventType,
      eventTimestamp: new Date(input.eventTimestamp),
      payload: input.payload,
      activityId: activity?.id,
    });

    // Duplicate event: idempotent no-op.
    if (!inserted) {
      return ok({ ok: true });
    }

    if (activity && input.status) {
      activity.setCommunicationStatus(input.status, now, {
        externalMessageId: input.externalMessageId,
        externalThreadId: input.externalThreadId ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        rawProviderPayload: input.payload,
      });
      await this.activityRepo.update(ctx.tenantId, activity);
    }

    return ok({ ok: true });
  }
}
