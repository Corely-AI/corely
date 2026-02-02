import { z } from "zod";
import { IssueSchema } from "./issue.types";

export const ReopenIssueRequestSchema = z.object({
  issueId: z.string().min(1),
  note: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const ReopenIssueResponseSchema = z.object({
  issue: IssueSchema,
});

export type ReopenIssueRequest = z.infer<typeof ReopenIssueRequestSchema>;
export type ReopenIssueResponse = z.infer<typeof ReopenIssueResponseSchema>;
