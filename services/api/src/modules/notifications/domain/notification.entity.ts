export interface Notification {
  id: string;
  tenantId: string;
  workspaceId: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body?: string;
  resource: {
    module: string;
    entityType: string;
    entityId: string;
    url?: string;
  };
  data?: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationRecipient {
  id: string;
  tenantId: string;
  workspaceId: string;
  notificationId: string;
  userId: string;
  readAt: Date | null;
  createdAt: Date;
}
