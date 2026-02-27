import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import type { NotificationRepositoryPort } from "../ports/notification.repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { Inject, Injectable } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "../ports/notification.repository.port";

@Injectable()
@RequireTenant()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepositoryPort
  ) {}

  async execute(ctx: UseCaseContext) {
    const { tenantId, workspaceId, userId } = resolveTenantScope(ctx);
    const count = await this.repo.countUnread(tenantId, workspaceId, userId);
    return { count };
  }
}
