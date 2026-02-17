import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import type { NotificationRepositoryPort } from "../ports/notification.repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { Inject, Injectable } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "../ports/notification.repository.port";

@Injectable()
@RequireTenant()
export class MarkReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepositoryPort
  ) {}

  async execute(notificationId: string, ctx: UseCaseContext) {
    const { tenantId, workspaceId, userId } = resolveTenantScope(ctx);
    await this.repo.markRead(tenantId, workspaceId, userId, [notificationId]);
  }
}
