import { z } from "zod";
import {
  ActivityDtoSchema,
  ActivityStatusSchema,
  ActivityTypeSchema,
  ChannelKeySchema,
  CommunicationDirectionSchema,
  CommunicationStatusSchema,
} from "./activity.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const ListActivitiesInputSchema = z.object({
  partyId: z.string().optional(),
  dealId: z.string().optional(),
  type: ActivityTypeSchema.optional(),
  status: ActivityStatusSchema.optional(),
  channelKey: ChannelKeySchema.optional(),
  direction: CommunicationDirectionSchema.optional(),
  communicationStatus: CommunicationStatusSchema.optional(),
  activityDateFrom: utcInstantSchema.optional(),
  activityDateTo: utcInstantSchema.optional(),
  assignedToUserId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export const ListActivitiesOutputSchema = z.object({
  items: z.array(ActivityDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListActivitiesInput = z.infer<typeof ListActivitiesInputSchema>;
export type ListActivitiesOutput = z.infer<typeof ListActivitiesOutputSchema>;
