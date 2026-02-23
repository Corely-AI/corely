import { z } from "zod";

export const DIRECTORY_EVENT_TYPES = {
  LEAD_CREATED: "directory.lead.created",
} as const;

export const DirectoryLeadCreatedEventSchema = z.object({
  leadId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  restaurantId: z.string(),
  restaurantSlug: z.string(),
  restaurantName: z.string(),
  name: z.string(),
  contact: z.string(),
  message: z.string(),
  createdAt: z.string().datetime(),
});
export type DirectoryLeadCreatedEvent = z.infer<typeof DirectoryLeadCreatedEventSchema>;
