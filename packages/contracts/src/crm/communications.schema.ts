import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import {
  ActivityDtoSchema,
  ActivityRecordSourceSchema,
  ChannelKeySchema,
  CommunicationDirectionSchema,
  CommunicationStatusSchema,
} from "./activity.types";

const CommunicationBaseSchema = z.object({
  channelKey: ChannelKeySchema,
  subject: z.string().optional(),
  body: z.string().optional(),
  dealId: z.string().optional(),
  partyId: z.string().optional(),
  activityDate: utcInstantSchema.optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  participants: z.array(z.string()).optional(),
  threadKey: z.string().optional(),
  externalThreadId: z.string().optional(),
  externalMessageId: z.string().optional(),
  providerKey: z.string().optional(),
  recordSource: ActivityRecordSourceSchema.optional(),
  recordSourceDetails: z.record(z.unknown()).optional(),
  attachments: z.array(z.record(z.unknown())).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateCommunicationDraftInputSchema = CommunicationBaseSchema.extend({
  direction: z.literal("OUTBOUND"),
  status: z.literal("DRAFT").default("DRAFT"),
});

export const CreateCommunicationDraftOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type CreateCommunicationDraftInput = z.infer<typeof CreateCommunicationDraftInputSchema>;
export type CreateCommunicationDraftOutput = z.infer<typeof CreateCommunicationDraftOutputSchema>;

export const SendCommunicationInputSchema = z.object({
  communicationId: z.string(),
  providerKey: z.string().optional(),
});

export const SendCommunicationOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type SendCommunicationInput = z.infer<typeof SendCommunicationInputSchema>;
export type SendCommunicationOutput = z.infer<typeof SendCommunicationOutputSchema>;

export const LogCommunicationInputSchema = CommunicationBaseSchema.extend({
  direction: CommunicationDirectionSchema,
  status: CommunicationStatusSchema.default("LOGGED"),
  occurredAt: utcInstantSchema.optional(),
  openUrl: z.string().url().optional(),
});

export const LogCommunicationOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type LogCommunicationInput = z.infer<typeof LogCommunicationInputSchema>;
export type LogCommunicationOutput = z.infer<typeof LogCommunicationOutputSchema>;

export const CommunicationWebhookInputSchema = z.object({
  tenantId: z.string(),
  providerKey: z.string().min(2),
  channelKey: ChannelKeySchema,
  externalMessageId: z.string().min(1),
  externalThreadId: z.string().optional(),
  eventType: z.string().min(1),
  eventTimestamp: utcInstantSchema,
  status: CommunicationStatusSchema.optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  payload: z.record(z.unknown()),
});

export const CommunicationWebhookOutputSchema = z.object({
  ok: z.literal(true),
});

export type CommunicationWebhookInput = z.infer<typeof CommunicationWebhookInputSchema>;
export type CommunicationWebhookOutput = z.infer<typeof CommunicationWebhookOutputSchema>;
