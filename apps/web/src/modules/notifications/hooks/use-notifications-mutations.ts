import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/notifications-api";
import { notificationListKey, notificationUnreadCountKey } from "../api/queries";
import type { ListNotificationsResponse } from "@corely/contracts";

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationUnreadCountKey });

      // Snapshot previous value
      const previousCount = queryClient.getQueryData<number>(notificationUnreadCountKey);

      // Optimistically update unread count
      if (previousCount !== undefined) {
        queryClient.setQueryData(notificationUnreadCountKey, Math.max(0, previousCount - 1));
      }

      // Optimistically update lists to show item as read
      // We need to iterate over all list queries that might contain this item
      queryClient.setQueriesData<ListNotificationsResponse>(
        { queryKey: notificationListKey() },
        (old) => {
          if (!old) {return old;}
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? { ...item, readAt: new Date().toISOString() } : item
            ),
          };
        }
      );

      return { previousCount };
    },
    onError: (err, id, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationUnreadCountKey, context.previousCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationUnreadCountKey });
      void queryClient.invalidateQueries({ queryKey: notificationListKey() });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationUnreadCountKey });

      const previousCount = queryClient.getQueryData<number>(notificationUnreadCountKey);

      // Optimistically set count to 0
      queryClient.setQueryData(notificationUnreadCountKey, 0);

      // Optimistically mark all visible items as read
      queryClient.setQueriesData<ListNotificationsResponse>(
        { queryKey: notificationListKey() },
        (old) => {
          if (!old) {return old;}
          return {
            ...old,
            items: old.items.map((item) => ({ ...item, readAt: new Date().toISOString() })),
          };
        }
      );

      return { previousCount };
    },
    onError: (err, variables, context) => {
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(notificationUnreadCountKey, context.previousCount);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: notificationUnreadCountKey });
      void queryClient.invalidateQueries({ queryKey: notificationListKey() });
    },
  });
}
