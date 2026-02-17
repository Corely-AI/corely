import { type Notification } from "../../domain/notification.entity";

export interface ListNotificationsParams {
  tenantId: string;
  workspaceId: string;
  userId: string;
  status: "all" | "unread";
  page: number;
  pageSize: number;
}

export interface ListNotificationsResult {
  items: Notification[];
  total: number;
}

export interface NotificationRepositoryPort {
  list(params: ListNotificationsParams): Promise<ListNotificationsResult>;
  countUnread(tenantId: string, workspaceId: string, userId: string): Promise<number>;
  markRead(
    tenantId: string,
    workspaceId: string,
    userId: string,
    notificationIds: string[]
  ): Promise<void>;
  markAllRead(tenantId: string, workspaceId: string, userId: string): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol("NOTIFICATION_REPOSITORY");
