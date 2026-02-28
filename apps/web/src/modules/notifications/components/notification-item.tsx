import React, { useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import { formatRelativeTime } from "@/shared/lib/formatters";
import { Button } from "@corely/ui";
import { Check, Info, AlertTriangle, AlertCircle, ExternalLink } from "lucide-react";
import type { NotificationListItem } from "@corely/contracts";
import { Link } from "react-router-dom";

export interface NotificationItemProps {
  notification: NotificationListItem;
  onMarkRead: (id: string) => void;
  className?: string;
}

export function NotificationItem({ notification, onMarkRead, className }: NotificationItemProps) {
  const isRead = !!notification.readAt;

  const Icon = useMemo(() => {
    switch (notification.severity) {
      case "critical":
        return AlertCircle;
      case "warning":
        return AlertTriangle;
      case "info":
      default:
        return Info;
    }
  }, [notification.severity]);

  const iconColor = useMemo(() => {
    switch (notification.severity) {
      case "critical":
        return "text-destructive";
      case "warning":
        return "text-warning";
      case "info":
      default:
        return "text-primary";
    }
  }, [notification.severity]);

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-3 transition-colors hover:bg-muted/50 rounded-md border border-transparent",
        !isRead && "bg-muted/10 border-border/50",
        className
      )}
    >
      <div className={cn("mt-0.5 shrink-0", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium leading-none", !isRead && "font-semibold")}>
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        {notification.body && (
          <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
        )}

        {notification.resource?.url && (
          <Link
            to={notification.resource.url}
            className="inline-flex items-center text-xs text-primary hover:underline mt-1"
            onClick={() => !isRead && onMarkRead(notification.id)}
          >
            View details <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        )}
      </div>

      {!isRead && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          title="Mark as read"
        >
          <Check className="h-3 w-3" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
    </div>
  );
}
