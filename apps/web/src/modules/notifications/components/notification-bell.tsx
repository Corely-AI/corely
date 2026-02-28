import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { Button } from "@corely/ui";
import { Bell } from "lucide-react";
import { useNotificationsStream } from "../hooks/use-notifications-stream";
import { useUnreadNotificationsCount } from "../hooks/use-notifications-queries";
import { NotificationList } from "./notification-list";
import { cn } from "@/shared/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  // Activate SSE stream
  useNotificationsStream();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute top-1.5 right-1.5 flex h-2.5 w-2.5",
                "items-center justify-center rounded-full ring-2 ring-background",
                "bg-destructive"
              )}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 w-auto border-none shadow-lg">
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}
