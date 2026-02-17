import { z } from "zod";
import {
  ActivityDtoSchema,
  ActivityRecordSourceSchema,
  ChannelKeySchema,
  CommunicationDirectionSchema,
  CommunicationStatusSchema,
} from "./activity.types";
import { utcInstantSchema } from "../shared/local-date.schema";

const CreateActivityBaseSchema = z.object({
  subject: z.string().min(1),
  body: z.string().optional(),
  partyId: z.string().optional(),
  dealId: z.string().optional(),
  activityDate: utcInstantSchema.optional(),
  dueAt: utcInstantSchema.optional(),
  assignedToUserId: z.string().optional(),
  channelKey: ChannelKeySchema.optional(),
  direction: CommunicationDirectionSchema.optional(),
  messageDirection: z.string().optional(), // deprecated alias (compat)
  messageTo: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  participants: z.array(z.string()).optional(),
  threadKey: z.string().optional(),
  externalThreadId: z.string().optional(),
  externalMessageId: z.string().optional(),
  communicationStatus: CommunicationStatusSchema.optional(),
  providerKey: z.string().optional(),
  recordSource: ActivityRecordSourceSchema.optional(),
  recordSourceDetails: z.record(z.unknown()).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  rawProviderPayload: z.record(z.unknown()).optional(),
  openUrl: z.string().optional(),
  outcome: z.string().optional(),
  durationSeconds: z.number().optional(),
  location: z.string().optional(),
  attendees: z.array(z.unknown()).optional(),
  attachments: z.array(z.record(z.unknown())).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const StandardCreateActivitySchema = CreateActivityBaseSchema.extend({
  type: z.enum(["NOTE", "TASK", "CALL", "MEETING", "SYSTEM_EVENT"]),
});

const CreateCommunicationActivitySchema = CreateActivityBaseSchema.extend({
  type: z.literal("COMMUNICATION"),
  channelKey: ChannelKeySchema,
  direction: CommunicationDirectionSchema,
  communicationStatus: CommunicationStatusSchema.default("LOGGED"),
});

export const CreateActivityInputSchema = z.discriminatedUnion("type", [
  StandardCreateActivitySchema,
  CreateCommunicationActivitySchema,
]);

export const CreateActivityOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type CreateActivityInput = z.infer<typeof CreateActivityInputSchema>;
export type CreateActivityOutput = z.infer<typeof CreateActivityOutputSchema>;
