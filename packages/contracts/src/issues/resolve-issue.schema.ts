import { z } from "zod";
import { IssueSchema } from "./issue.types";

export const ResolveIssueRequestSchema = z.object({
  issueId: z.string().min(1),
  resolutionNote: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const ResolveIssueResponseSchema = z.object({
  issue: IssueSchema,
});

export type ResolveIssueRequest = z.infer<typeof ResolveIssueRequestSchema>;
export type ResolveIssueResponse = z.infer<typeof ResolveIssueResponseSchema>;
