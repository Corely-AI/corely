import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import { Tabs, TabsList, TabsTrigger, Button, Badge } from "@corely/ui";
import { CheckCheck } from "lucide-react";
import {
  useNotificationsList,
  useUnreadNotificationsCount,
} from "../hooks/use-notifications-queries";
import {
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../hooks/use-notifications-mutations";
import { NotificationItem } from "../components/notification-item";
import { EmptyState } from "@/shared/components/EmptyState";
import { useListUrlState, ActiveFilterChips, FilterPanel, ListToolbar } from "@/shared/list-kit";

export function NotificationsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"unread" | "all">("unread");

  const {
    data: listData,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotificationsList({
    page: 1,
    pageSize: 50, // Larger page size for full page
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
      // stay or switch? maybe stay
    }
  };

  const items = listData?.items ?? [];

  const primaryAction = (
    <>
      {unreadCount > 0 && (
        <Button
          variant="outline"
          onClick={handleMarkAllRead}
          disabled={markAllReadMutation.isPending}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {t("notifications.markAllRead", "Mark all read")}
        </Button>
      )}
    </>
  );

  return (
    <CrudListPageLayout
      title={t("notifications.title", "Notifications")}
      primaryAction={primaryAction}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="unread">
              {t("notifications.tabs.unread", "Unread")}
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">{t("notifications.tabs.all", "All")}</TabsTrigger>
          </TabsList>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            {t("common.refresh", "Refresh")}
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              {t("common.loading", "Loading...")}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">
              {t("notifications.error", "Failed to load notifications.")}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title={t("notifications.emptyTitle", "No notifications")}
              description={
                tab === "unread"
                  ? t("notifications.emptyUnread", "You're all caught up!")
                  : t("notifications.emptyAll", "You have no notifications yet.")
              }
            />
          ) : (
            <div className="grid gap-2">
              {items.map((item) => (
                <div key={item.id} className="bg-card border rounded-lg overflow-hidden">
                  <NotificationItem
                    notification={item}
                    onMarkRead={handleMarkRead}
                    className="border-0 rounded-none"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Tabs>
    </CrudListPageLayout>
  );
}
