import { apiClient } from "./api-client";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  UnreadCountResponse,
  MarkReadRequest,
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
}

export const notificationsApi = new NotificationsApi();
