import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/notifications-api";
import { notificationUnreadCountKey, notificationListKey } from "../api/queries";
import { useAuth } from "@/lib/auth-provider";

export function useNotificationsStream() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mounted = !!user; // Only subscribe if user is logged in

  useEffect(() => {
    if (!mounted) {return;}

    const unsubscribe = notificationsApi.subscribeToNotifications({
      onCountChanged: (count) => {
        // Direct cache update for immediate feedback
        queryClient.setQueryData(notificationUnreadCountKey, count);

        // Invalidate lists to fetch new items
        // We could optimistically prepend, but invalidating is safer for consistency
        void queryClient.invalidateQueries({ queryKey: notificationListKey() });
      },
      onError: (err) => {
        console.error("Notification stream error:", err);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [mounted, queryClient]);
}
