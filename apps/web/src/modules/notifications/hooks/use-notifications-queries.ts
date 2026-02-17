import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/notifications-api";
import { notificationListKey, notificationUnreadCountKey } from "../api/queries";
import { useAuth } from "@/lib/auth-provider";

export function useNotificationsList(
  params: {
    page?: number;
    pageSize?: number;
    status?: "all" | "unread";
  } = {}
) {
  const { user } = useAuth();
  const enabled = !!user;

  return useQuery({
    queryKey: notificationListKey(params),
    queryFn: () => notificationsApi.listNotifications(params),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes (will be invalidated by mutations/SSE)
  });
}

export function useUnreadNotificationsCount() {
  const { user } = useAuth();
  const enabled = !!user;

  return useQuery({
    queryKey: notificationUnreadCountKey,
    queryFn: async () => {
      const res = await notificationsApi.getUnreadCount();
      return res.count;
    },
    enabled,
    refetchInterval: (query) => {
      // Poll every 30s if enabled and window is focused, unless we have recent data
      return 30_000;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}
