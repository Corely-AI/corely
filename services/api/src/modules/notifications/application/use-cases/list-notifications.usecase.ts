import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import type { ListNotificationsRequest } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import type { NotificationRepositoryPort } from "../ports/notification.repository.port";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { Inject, Injectable } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "../ports/notification.repository.port";

@Injectable()
@RequireTenant()
export class ListNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repo: NotificationRepositoryPort
  ) {}

  async execute(input: ListNotificationsRequest, ctx: UseCaseContext) {
    const { tenantId, workspaceId, userId } = resolveTenantScope(ctx);

    const { items, total } = await this.repo.list({
      tenantId,
      workspaceId,
      userId,
      status: (input.status as "all" | "unread") || "all",
      page: input.page || 1,
      pageSize: input.pageSize || 20,
    });

    return {
      items,
      pageInfo: buildPageInfo(total, input.page || 1, input.pageSize || 20),
    };
  }
}
