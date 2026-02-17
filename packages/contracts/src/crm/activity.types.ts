import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const ActivityTypeSchema = z.enum([
  "NOTE",
  "TASK",
  "CALL",
  "MEETING",
  "COMMUNICATION",
  "SYSTEM_EVENT",
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ActivityStatusSchema = z.enum(["OPEN", "COMPLETED", "CANCELED"]);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

export const ChannelKeySchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9_]+$/);
export type ChannelKey = z.infer<typeof ChannelKeySchema>;

export const CommunicationDirectionSchema = z.enum(["INBOUND", "OUTBOUND"]);
export type CommunicationDirection = z.infer<typeof CommunicationDirectionSchema>;

export const CommunicationStatusSchema = z.enum([
  "LOGGED",
  "DRAFT",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
]);
export type CommunicationStatus = z.infer<typeof CommunicationStatusSchema>;

export const ActivityRecordSourceSchema = z.enum(["MANUAL", "SYSTEM", "INTEGRATION"]);
export type ActivityRecordSource = z.infer<typeof ActivityRecordSourceSchema>;

export const ActivityAttachmentSchema = z.object({
  id: z.string().optional(),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  url: z.string().url().optional(),
  externalFileId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ActivityAttachment = z.infer<typeof ActivityAttachmentSchema>;

const ActivityBaseDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  subject: z.string(),
  body: z.string().nullable(),
  channelKey: ChannelKeySchema.nullable().optional(),
  direction: CommunicationDirectionSchema.nullable().optional(),
  communicationStatus: CommunicationStatusSchema.nullable().optional(),
  messageDirection: z.string().nullable().optional(), // deprecated alias (compat)
  messageTo: z.string().nullable().optional(), // deprecated alias (compat)
  openUrl: z.string().nullable().optional(),
  partyId: z.string().nullable(),
  dealId: z.string().nullable(),
  activityDate: utcInstantSchema.nullable().optional(),
  ownerId: z.string().nullable().optional(),
  recordSource: ActivityRecordSourceSchema.nullable().optional(),
  recordSourceDetails: z.record(z.unknown()).nullable().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  participants: z.array(z.string()).optional(),
  threadKey: z.string().nullable().optional(),
  externalThreadId: z.string().nullable().optional(),
  externalMessageId: z.string().nullable().optional(),
  providerKey: z.string().nullable().optional(),
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  rawProviderPayload: z.record(z.unknown()).nullable().optional(),
  attachments: z.array(ActivityAttachmentSchema).optional(),
  dueAt: utcInstantSchema.nullable(),
  completedAt: utcInstantSchema.nullable(),
  status: ActivityStatusSchema,
  outcome: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
  attendees: z.array(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  assignedToUserId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

const NoteActivityDtoSchema = ActivityBaseDtoSchema.extend({
  type: z.literal("NOTE"),
});
const TaskActivityDtoSchema = ActivityBaseDtoSchema.extend({
  type: z.literal("TASK"),
});
const CallActivityDtoSchema = ActivityBaseDtoSchema.extend({
  type: z.literal("CALL"),
});
const MeetingActivityDtoSchema = ActivityBaseDtoSchema.extend({
  type: z.literal("MEETING"),
});
const SystemEventActivityDtoSchema = ActivityBaseDtoSchema.extend({
  type: z.literal("SYSTEM_EVENT"),
});
const CommunicationActivityDtoSchema = ActivityBaseDtoSchema.extend({
  type: z.literal("COMMUNICATION"),
  channelKey: ChannelKeySchema,
  direction: CommunicationDirectionSchema,
  communicationStatus: CommunicationStatusSchema,
});

export const ActivityDtoSchema = z.discriminatedUnion("type", [
  NoteActivityDtoSchema,
  TaskActivityDtoSchema,
  CallActivityDtoSchema,
  MeetingActivityDtoSchema,
  CommunicationActivityDtoSchema,
  SystemEventActivityDtoSchema,
]);

export type ActivityDto = z.infer<typeof ActivityDtoSchema>;
export type ActivityDTO = ActivityDto;

// Timeline item union type (can be Activity or other timeline events like stage transitions)
export const TimelineItemTypeSchema = z.enum(["ACTIVITY", "STAGE_TRANSITION", "NOTE", "MESSAGE"]);
export type TimelineItemType = z.infer<typeof TimelineItemTypeSchema>;

export const TimelineItemSchema = z.object({
  id: z.string(),
  type: TimelineItemTypeSchema,
  timestamp: utcInstantSchema,
  subject: z.string(),
  body: z.string().nullable(),
  actorUserId: z.string().nullable(),
  actorDisplayName: z.string().nullable().optional(),
  channelKey: ChannelKeySchema.nullable().optional(),
  direction: z.string().nullable().optional(),
  status: CommunicationStatusSchema.nullable().optional(),
  to: z.string().nullable().optional(),
  threadKey: z.string().nullable().optional(),
  openUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(), // flexible for different timeline item types
});

export type TimelineItem = z.infer<typeof TimelineItemSchema>;
