# Notifications Module

The Notifications module provides a robust system for delivering in-app alerts and updates to users. It supports both **polling** and **real-time** delivery via Server-Sent Events (SSE), backed by a persistent database storage and an asynchronous worker pipeline for scalable event processing.

## 1. Overview

The system is designed to handle high-throughput notification generation without impacting user-facing API performance. Notifications are generated asynchronously by background workers and stored in a central `Notification` table, with per-recipient tracking in `NotificationRecipient`.

### Key Features

- **In-App Inbox**: Persistent storage of notifications.
- **Real-Time Updates**: SSE stream for instant badge count updates.
- **Read Tracking**: Per-user read status explicitly tracked.
- **Idempotency**: Deduplication keys prevent duplicate alerts from retried jobs.
- **Scalability**: Decoupled generation (Worker) from consumption (API).

---

## 2. Architecture

The flow consists of three main stages: **Emission**, **Processing**, and **Delivery**.

### Flow Diagram

1. **Trigger**: Any service (API or Worker) emits a `NotificationIntent` event to the Outbox.
2. **Processing**: The `OutboxPollerService` picks up the event.
3. **Handler**: `NotificationIntentHandler` processes the intent:
   - Creates a unique `Notification` entry (deduplicated by `dedupeKey`).
   - Fan-out: Creates `NotificationRecipient` entries for all targeted users.
4. **Delivery**:
   - **Polling**: Frontend calls `GET /notifications` to list items.
   - **SSE**: Frontend subscribes to `GET /notifications/stream` for live unread count updates.

---

## 3. Data Model

The schema is optimized for querying a user's inbox and unread count efficiently.

### `Notification`

Stores the content of the notification. De-duplicated by `[tenantId, workspaceId, dedupeKey]`.

- **id**: UUID
- **type**: Event type (e.g., `invoice.due`, `export.completed`)
- **severity**: `info` | `warning` | `critical`
- **title**: Short summary
- **body**: Detailed message (optional)
- **resource**: JSON linking to the entity (e.g., `{ module: "invoices", id: "123" }`)
- **data**: Arbitrary JSON payload
- **dedupeKey**: Unique key for idempotency

### `NotificationRecipient`

Links a notification to a specific user and tracks read status.

- **userId**: The recipient
- **readAt**: Timestamp when read (null = unread)
- **notificationId**: FK to `Notification`

---

## 4. Backend Implementation

### Worker (Producer)

The worker handles the heavy lifting of creating notifications.

**Emitting a Notification:**
Inject `NotificationEmitterService` and call `emitIntent`:

```typescript
// In your service/runner
constructor(private readonly notifications: NotificationEmitterService) {}

async notify() {
  await this.notifications.emitIntent({
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    recipientUserIds: ["user-1", "user-2"],
    type: "invoice.overdue",
    severity: "warning",
    title: "Invoice #1024 is overdue",
    dedupeKey: "invoice-ovd-1024", // Prevents duplicates
    resource: {
      module: "invoices",
      entityType: "invoice",
      entityId: "1024"
    }
  });
}
```

### API (Consumer)

The API provides endpoints for the frontend to consume.

- `GET /notifications`: List notifications (filterable by `status=unread`).
- `GET /notifications/unread-count`: Get the count of unread items.
- `PATCH /notifications/:id/read`: Mark a single notification as read.
- `POST /notifications/mark-all-read`: Mark all as read.
- `GET /notifications/stream`: SSE stream for real-time updates.

---

## 5. Frontend Integration

A dedicated API client `notificationsApi` is available in `@apps/web/src/lib/notifications-api.ts`.

### Hooks & Usage

**1. Fetching Notifications:**
Use standard React Query based on the API client.

```typescript
import { notificationsApi } from "@/lib/notifications-api";
import { useQuery } from "@tanstack/react-query";

const { data } = useQuery({
  queryKey: ["notifications", "list"],
  queryFn: () => notificationsApi.listNotifications({ page: 1 }),
});
```

**2. Real-time Subscription:**
Subscribe to the SSE stream to update the unread badge automatically.

```typescript
import { notificationsApi } from "@/lib/notifications-api";
import { useEffect, useState } from "react";

// inside your layout or specialized hook
useEffect(() => {
  const unsubscribe = notificationsApi.subscribeToNotifications({
    onCountChanged: (count) => {
      // Update badge store/context
      setUnreadCount(count);
    },
    onError: (err) => console.error(err),
  });

  return unsubscribe;
}, []);
```

---

## 6. Future Improvements

- **Email/Push Channels**: Extend `NotificationIntent` to support `channels: ['in-app', 'email']`.
- **User Preferences**: Allow users to opt-out of specific notification types.
- **Actionable Notifications**: Add buttons directly to the notification body.
- **Grouping**: Group similar notifications (e.g., "5 invoices updated").
