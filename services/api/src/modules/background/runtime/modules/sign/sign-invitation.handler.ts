import { Cron, CronExpression } from "@nestjs/schedule";
import { Inject, Injectable } from "@nestjs/common";
import { EMAIL_SENDER_PORT, type EmailSenderPort } from "@corely/kernel";
import { z } from "zod";
import { NativeCoachingAgreements } from "../../../../coaching-engagements/public";
import {
  FinalizeSignRequestUseCase,
  ExpireSignRequestsUseCase,
  DeliverSignInvitationUseCase,
} from "../../../../sign/public";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
@Injectable()
export class SignCollectedHandler implements EventHandler {
  readonly eventType = "sign.request.collected.v1";
  constructor(private readonly finalizeRequest: FinalizeSignRequestUseCase) {}
  async handle(event: OutboxEvent) {
    const { workspaceId, requestId } = z
      .object({ workspaceId: z.string().min(1), requestId: z.string().uuid() })
      .parse(event.payload);
    await this.finalizeRequest.execute({ tenantId: event.tenantId, workspaceId, requestId });
  }
}
@Injectable()
export class SignVerifiedHandler implements EventHandler {
  readonly eventType = "sign.request.completed.v1";
  constructor(private readonly coaching: NativeCoachingAgreements) {}
  async handle(event: OutboxEvent) {
    const { workspaceId, requestId, artifactSha256 } = z
      .object({
        workspaceId: z.string().min(1),
        requestId: z.string().uuid(),
        artifactSha256: z.string().regex(/^[0-9a-f]{64}$/),
      })
      .parse(event.payload);
    await this.coaching.verified(event.tenantId, workspaceId, requestId, artifactSha256);
  }
}
const payload = z.object({
  workspaceId: z.string().min(1),
  requestId: z.string().uuid(),
  recipientId: z.string().uuid(),
  deliveryId: z.string().uuid(),
  digest: z.string().regex(/^[0-9a-f]{64}$/),
});
@Injectable()
export class SignInvitationHandler implements EventHandler {
  readonly eventType = "sign.invitation.requested.v1";
  constructor(
    private readonly expireRequests: ExpireSignRequestsUseCase,
    private readonly deliverInvitation: DeliverSignInvitationUseCase,
    @Inject(EMAIL_SENDER_PORT) private readonly sender: EmailSenderPort
  ) {}
  @Cron(CronExpression.EVERY_MINUTE) expire() {
    return this.expireRequests.execute();
  }
  async handle(event: OutboxEvent) {
    const { workspaceId, requestId, recipientId, deliveryId, digest } = payload.parse(
      event.payload
    );
    await this.deliverInvitation.execute(
      { workspaceId, requestId, recipientId, deliveryId, digest, tenantId: event.tenantId },
      this.sender
    );
  }
}
