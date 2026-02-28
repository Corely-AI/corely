import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";

// --- Domain Models ---

export const NotificationSeveritySchema = z.enum(["info", "warning", "critical"]);
export type NotificationSeverity = z.infer<typeof NotificationSeveritySchema>;

export const NotificationResourceSchema = z.object({
  module: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  url: z.string().optional(),
});
export type NotificationResource = z.infer<typeof NotificationResourceSchema>;

export const NotificationListItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  type: z.string(),
  severity: NotificationSeveritySchema,
  title: z.string(),
  body: z.string().optional(),
  resource: NotificationResourceSchema,
  data: z.record(z.unknown()).optional(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationListItem = z.infer<typeof NotificationListItemSchema>;

// --- API Requirements ---

export const ListNotificationsRequestSchema = ListQuerySchema.extend({
  status: z.enum(["all", "unread"]).optional().default("all"),
  type: z.string().optional(),
  severity: NotificationSeveritySchema.optional(),
});
export type ListNotificationsRequest = z.infer<typeof ListNotificationsRequestSchema>;

export const ListNotificationsResponseSchema = z.object({
  items: z.array(NotificationListItemSchema),
  pageInfo: PageInfoSchema,
});
export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponseSchema>;

export const UnreadCountResponseSchema = z.object({
  count: z.number().int().nonnegative(),
});
export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;

export const MarkReadRequestSchema = z.object({
  read: z.literal(true),
});
export type MarkReadRequest = z.infer<typeof MarkReadRequestSchema>;

// --- SSE Events ---

export const NotificationCreatedEventSchema = z.object({
  type: z.literal("notifications.created"),
  notification: NotificationListItemSchema,
});
export type NotificationCreatedEvent = z.infer<typeof NotificationCreatedEventSchema>;

export const NotificationCountChangedEventSchema = z.object({
  type: z.literal("notifications.countChanged"),
  unreadCount: z.number(),
});
export type NotificationCountChangedEvent = z.infer<typeof NotificationCountChangedEventSchema>;

export const NotificationSseEventSchema = z.discriminatedUnion("type", [
  NotificationCreatedEventSchema,
  NotificationCountChangedEventSchema,
]);
export type NotificationSseEvent = z.infer<typeof NotificationSseEventSchema>;

// --- Outbox Events (Worker) ---

export const NotificationIntentPayloadSchema = z.object({
  tenantId: z.string(),
  workspaceId: z.string(),
  recipientUserIds: z.array(z.string()),
  type: z.string(),
  severity: NotificationSeveritySchema,
  title: z.string(),
  body: z.string().optional(),
  resource: NotificationResourceSchema,
  data: z.record(z.unknown()).optional(),
  dedupeKey: z.string(),
  createdAt: z.string(), // ISO string
});
export type NotificationIntentPayload = z.infer<typeof NotificationIntentPayloadSchema>;

export const NOTIFICATION_EVENTS = {
  INTENT: "notifications.intent",
} as const;
