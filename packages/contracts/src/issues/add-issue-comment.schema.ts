import { z } from "zod";
import { AttachmentMetadataSchema, IssueCommentSchema } from "./issue.types";

export const AddIssueCommentRequestSchema = z.object({
  issueId: z.string().min(1),
  body: z.string().min(1),
  attachments: z.array(AttachmentMetadataSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const AddIssueCommentResponseSchema = z.object({
  comment: IssueCommentSchema,
});

export type AddIssueCommentRequest = z.infer<typeof AddIssueCommentRequestSchema>;
export type AddIssueCommentResponse = z.infer<typeof AddIssueCommentResponseSchema>;
