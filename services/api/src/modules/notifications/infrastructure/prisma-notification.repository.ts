import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  ListNotificationsParams,
  ListNotificationsResult,
  NotificationRepositoryPort,
} from "../application/ports/notification.repository.port";
import type { Notification } from "../domain/notification.entity";
import { NotificationSeveritySchema } from "@corely/contracts";

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListNotificationsParams): Promise<ListNotificationsResult> {
    const { tenantId, workspaceId, userId, status, page, pageSize } = params;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // We join NotificationRecipient to filter by userId and read status
    // NotificationRecipient contains readAt.
    // We want notifications where there is a recipient entry for this user.
    // And if status is "unread", recipient.readAt must be null.

    const where: any = {
      tenantId,
      workspaceId,
      recipients: {
        some: {
          userId,
          ...(status === "unread" ? { readAt: null } : {}),
        },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          recipients: {
            where: { userId },
            select: { readAt: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToDomain(item, item.recipients[0])),
      total,
    };
  }

  async countUnread(tenantId: string, workspaceId: string, userId: string): Promise<number> {
    const count = await this.prisma.notificationRecipient.count({
      where: {
        tenantId,
        workspaceId,
        userId,
        readAt: null,
      },
    });
    return count;
  }

  async markRead(
    tenantId: string,
    workspaceId: string,
    userId: string,
    notificationIds: string[]
  ): Promise<void> {
    await this.prisma.notificationRecipient.updateMany({
      where: {
        tenantId,
        workspaceId,
        userId,
        notificationId: { in: notificationIds },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markAllRead(tenantId: string, workspaceId: string, userId: string): Promise<void> {
    await this.prisma.notificationRecipient.updateMany({
      where: {
        tenantId,
        workspaceId,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  private mapToDomain(
    item: any,
    recipient: { readAt: Date | null; createdAt: Date } | undefined
  ): Notification {
    // Parse resource and data from JSON
    const resource = typeof item.resource === "string" ? JSON.parse(item.resource) : item.resource;
    const data = item.data
      ? typeof item.data === "string"
        ? JSON.parse(item.data)
        : item.data
      : undefined;

    // Validate severity matches enum
    const severity = NotificationSeveritySchema.safeParse(item.severity).success
      ? item.severity
      : "info";

    return {
      id: item.id,
      tenantId: item.tenantId,
      workspaceId: item.workspaceId,
      type: item.type,
      severity,
      title: item.title,
      body: item.body ?? undefined,
      resource,
      data,
      readAt: recipient?.readAt ?? null,
      createdAt: item.createdAt,
    };
  }
}
