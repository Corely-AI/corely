import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import { localDateSchema } from "../shared/local-date.schema";
import {
  IssueSchema,
  IssuePrioritySchema,
  IssueSiteTypeSchema,
  IssueStatusSchema,
} from "./issue.types";

export const ListIssuesRequestSchema = ListQuerySchema.extend({
  status: IssueStatusSchema.optional(),
  priority: IssuePrioritySchema.optional(),
  siteType: IssueSiteTypeSchema.optional(),
  assigneeUserId: z.string().optional(),
  reporterUserId: z.string().optional(),
  customerPartyId: z.string().optional(),
  manufacturerPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
});

export const ListIssuesResponseSchema = z.object({
  items: z.array(IssueSchema),
  pageInfo: PageInfoSchema,
});

export type ListIssuesRequest = z.infer<typeof ListIssuesRequestSchema>;
export type ListIssuesResponse = z.infer<typeof ListIssuesResponseSchema>;
