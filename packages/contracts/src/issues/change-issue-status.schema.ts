import { z } from "zod";
import { IssueSchema, IssueStatusSchema } from "./issue.types";

export const ChangeIssueStatusRequestSchema = z.object({
  issueId: z.string().min(1),
  status: IssueStatusSchema,
  note: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const ChangeIssueStatusResponseSchema = z.object({
  issue: IssueSchema,
});

export type ChangeIssueStatusRequest = z.infer<typeof ChangeIssueStatusRequestSchema>;
export type ChangeIssueStatusResponse = z.infer<typeof ChangeIssueStatusResponseSchema>;
