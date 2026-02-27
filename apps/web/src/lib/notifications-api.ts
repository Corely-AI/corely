import { apiClient } from "./api-client";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  UnreadCountResponse,
  MarkReadRequest,
  NotificationCountChangedEvent,
} from "@corely/contracts";

export class NotificationsApi {
  async listNotifications(params?: ListNotificationsRequest): Promise<ListNotificationsResponse> {
    const query = new URLSearchParams();
    if (params?.page) {
      query.append("page", String(params.page));
    }
    if (params?.pageSize) {
      query.append("pageSize", String(params.pageSize));
    }
    if (params?.status) {
      query.append("status", params.status);
    }

    return apiClient.get<ListNotificationsResponse>(`/notifications?${query.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    return apiClient.get<UnreadCountResponse>("/notifications/unread-count", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async markRead(id: string, input: MarkReadRequest = { read: true }): Promise<void> {
    return apiClient.patch<void>(`/notifications/${id}/read`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async markAllRead(): Promise<void> {
    return apiClient.post<void>(
      "/notifications/mark-all-read",
      {},
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  subscribeToNotifications(options: {
    onCountChanged: (count: number) => void;
    onError?: (err: unknown) => void;
  }): () => void {
    const controller = new AbortController();

    // Subscribe to SSE stream
    apiClient
      .subscribeSse<NotificationCountChangedEvent>("/notifications/stream", {
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "notifications.countChanged") {
            // Verify payload shape if needed, but assuming typed
            const payload = event.data as unknown as NotificationCountChangedEvent;
            options.onCountChanged(payload.unreadCount);
          }
        },
        onError: (err) => options.onError?.(err),
      })
      .catch((err) => {
        // Only log if not aborted
        if (!controller.signal.aborted) {
          console.error("Failed to subscribe to notifications:", err);
          options.onError?.(err);
        }
      });

    return () => controller.abort();
  }
}

export const notificationsApi = new NotificationsApi();
