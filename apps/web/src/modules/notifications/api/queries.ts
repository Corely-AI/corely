import { createCrudQueryKeys } from "@/shared/crud";
import type { ListNotificationsRequest } from "@corely/contracts";

export const notificationKeys = createCrudQueryKeys("notifications");

export const notificationListKey = (params?: ListNotificationsRequest) =>
  notificationKeys.list(params);

export const notificationUnreadCountKey = ["notifications", "unread-count"];
