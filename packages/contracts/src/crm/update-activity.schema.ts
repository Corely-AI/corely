import { z } from "zod";
import {
  ActivityDtoSchema,
  ChannelKeySchema,
  CommunicationDirectionSchema,
  CommunicationStatusSchema,
} from "./activity.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const UpdateActivityInputSchema = z
  .object({
    activityId: z.string(),
    subject: z.string().min(1).optional(),
    body: z.string().optional(),
    dueAt: utcInstantSchema.optional(),
    assignedToUserId: z.string().nullable().optional(),
    outcome: z.string().nullable().optional(),
    durationSeconds: z.number().nullable().optional(),
    location: z.string().nullable().optional(),
    attendees: z.array(z.unknown()).nullable().optional(),
    channelKey: ChannelKeySchema.nullable().optional(),
    direction: CommunicationDirectionSchema.nullable().optional(),
    communicationStatus: CommunicationStatusSchema.nullable().optional(),
    to: z.array(z.string()).nullable().optional(),
    cc: z.array(z.string()).nullable().optional(),
    participants: z.array(z.string()).nullable().optional(),
    threadKey: z.string().nullable().optional(),
    externalThreadId: z.string().nullable().optional(),
    externalMessageId: z.string().nullable().optional(),
    providerKey: z.string().nullable().optional(),
    errorCode: z.string().nullable().optional(),
    errorMessage: z.string().nullable().optional(),
    rawProviderPayload: z.record(z.unknown()).nullable().optional(),
    activityDate: utcInstantSchema.nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  })
  .refine((val) => Object.keys(val).length > 1, {
    message: "At least one field besides activityId must be provided",
  });

export const UpdateActivityOutputSchema = z.object({
  activity: ActivityDtoSchema,
});

export type UpdateActivityInput = z.infer<typeof UpdateActivityInputSchema>;
export type UpdateActivityOutput = z.infer<typeof UpdateActivityOutputSchema>;
