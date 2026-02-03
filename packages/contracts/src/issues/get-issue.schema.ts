import { z } from "zod";
import { IssueSchema, IssueCommentSchema, IssueActivitySchema } from "./issue.types";

export const GetIssueRequestSchema = z.object({
  issueId: z.string().min(1),
});

export const GetIssueResponseSchema = z.object({
  issue: IssueSchema,
  comments: z.array(IssueCommentSchema),
  activity: z.array(IssueActivitySchema),
});

export type GetIssueRequest = z.infer<typeof GetIssueRequestSchema>;
export type GetIssueResponse = z.infer<typeof GetIssueResponseSchema>;
