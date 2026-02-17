import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, ScrollArea, Button, Skeleton } from "@corely/ui";
import { CheckCheck } from "lucide-react";
import {
  useNotificationsList,
  useUnreadNotificationsCount,
} from "../hooks/use-notifications-queries";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/use-notifications-mutations";
import { NotificationItem } from "./notification-item";
import { Link } from "react-router-dom";
import { cn } from "@/shared/lib/utils";

export function NotificationList() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const {
    data: listData,
    isLoading,
    isError,
    refetch,
  } = useNotificationsList({
    page: 1,
    pageSize: 20, // Reasonable limit for dropdown
    status: tab,
  });

  const { data: unreadCount } = useUnreadNotificationsCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
    if (tab === "unread") {
      // If we are on unread tab, maybe switch to all or show empty state
    }
  };

  const items = listData?.items ?? [];
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="w-[380px] flex flex-col h-[500px]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold">{t("notifications.title", "Notifications")}</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 text-xs"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            {t("notifications.markAllRead", "Mark all read")}
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col">
        <div className="px-4 pt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="unread">
              {t("notifications.tabs.unread", "Unread")}
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">{t("notifications.tabs.all", "All")}</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 mt-2">
          <div className="flex flex-col gap-1 p-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <p>{t("notifications.error", "Failed to load notifications")}</p>
                <Button variant="link" onClick={() => refetch()} size="sm">
                  {t("common.retry", "Retry")}
                </Button>
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="mb-2 rounded-full bg-muted p-3">
                  <CheckCheck className="h-6 w-6 opacity-50" />
                </div>
                <p>{t("notifications.empty", "No notifications")}</p>
                {tab === "unread" && (
                  <Button variant="link" onClick={() => setTab("all")} size="sm">
                    {t("notifications.viewAll", "View all history")}
                  </Button>
                )}
              </div>
            ) : (
              items.map((item) => (
                <NotificationItem key={item.id} notification={item} onMarkRead={handleMarkRead} />
              ))
            )}

            {!isLoading && !isEmpty && (
              <Button variant="ghost" size="sm" asChild className="mt-2 w-full">
                <Link to="/notifications">
                  {t("notifications.viewAll", "View all notifications")}
                </Link>
              </Button>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
