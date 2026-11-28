import { Inject, Injectable } from "@nestjs/common";
import { NotificationIntentPayloadSchema } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from "../ports/notification.repository.port";

@Injectable()
export class PublishNotificationUseCase {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepositoryPort) {}

  execute(payload: unknown, tx?: TransactionContext): Promise<void> {
    return this.repo.publish(NotificationIntentPayloadSchema.parse(payload), tx);
  }
}
