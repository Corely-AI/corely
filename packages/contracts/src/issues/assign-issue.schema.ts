import { z } from "zod";
import { IssueSchema } from "./issue.types";

export const AssignIssueRequestSchema = z.object({
  issueId: z.string().min(1),
  assigneeUserId: z.string().min(1),
  idempotencyKey: z.string().optional(),
});

export const AssignIssueResponseSchema = z.object({
  issue: IssueSchema,
});

export type AssignIssueRequest = z.infer<typeof AssignIssueRequestSchema>;
export type AssignIssueResponse = z.infer<typeof AssignIssueResponseSchema>;
