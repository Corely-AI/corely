import { z } from "zod";
import {
  AttachmentMetadataSchema,
  IssuePrioritySchema,
  IssueSchema,
  IssueSiteTypeSchema,
} from "./issue.types";

export const CreateIssueRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  priority: IssuePrioritySchema.optional().nullable(),
  siteType: IssueSiteTypeSchema,
  siteId: z.string().optional().nullable(),
  customerPartyId: z.string().optional().nullable(),
  manufacturerPartyId: z.string().optional().nullable(),
  attachments: z.array(AttachmentMetadataSchema).optional(),
  voiceNoteTranscript: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const CreateIssueResponseSchema = z.object({
  issue: IssueSchema,
});

export type CreateIssueRequest = z.infer<typeof CreateIssueRequestSchema>;
export type CreateIssueResponse = z.infer<typeof CreateIssueResponseSchema>;
