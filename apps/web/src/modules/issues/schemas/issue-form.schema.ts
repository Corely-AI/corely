import { z } from "zod";
import { IssuePrioritySchema, IssueSiteTypeSchema } from "@corely/contracts";

export const issueFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: IssuePrioritySchema.optional(),
  siteType: IssueSiteTypeSchema,
  siteId: z.string().optional(),
  customerPartyId: z.string().optional(),
  manufacturerPartyId: z.string().optional(),
  transcript: z.string().optional(),
});

export type IssueFormValues = z.infer<typeof issueFormSchema>;
