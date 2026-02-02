import { z } from "zod";
import {
  IssuePrioritySchema,
  IssueSiteTypeSchema,
  IssueStatusSchema,
  IssueTranscriptionSegmentSchema,
} from "./issue.types";

export const IssueCreatedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  status: IssueStatusSchema,
  priority: IssuePrioritySchema.optional().nullable(),
  siteType: IssueSiteTypeSchema,
  createdAt: z.string().datetime(),
  reporterUserId: z.string().optional().nullable(),
});
export type IssueCreatedEvent = z.infer<typeof IssueCreatedEventSchema>;

export const IssueStatusChangedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  fromStatus: IssueStatusSchema,
  toStatus: IssueStatusSchema,
  changedAt: z.string().datetime(),
  changedByUserId: z.string().optional().nullable(),
});
export type IssueStatusChangedEvent = z.infer<typeof IssueStatusChangedEventSchema>;

export const IssueCommentAddedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  commentId: z.string(),
  createdAt: z.string().datetime(),
  createdByUserId: z.string().optional().nullable(),
});
export type IssueCommentAddedEvent = z.infer<typeof IssueCommentAddedEventSchema>;

export const IssueResolvedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  resolvedAt: z.string().datetime(),
  resolvedByUserId: z.string().optional().nullable(),
});
export type IssueResolvedEvent = z.infer<typeof IssueResolvedEventSchema>;

export const IssueTranscriptionRequestedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  attachmentId: z.string(),
  documentId: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().nonnegative().optional(),
  requestedAt: z.string().datetime(),
  requestedByUserId: z.string().optional().nullable(),
  commentId: z.string().optional().nullable(),
});
export type IssueTranscriptionRequestedEvent = z.infer<
  typeof IssueTranscriptionRequestedEventSchema
>;

export const IssueTranscriptionCompletedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  attachmentId: z.string(),
  transcriptText: z.string(),
  transcriptSegments: z.array(IssueTranscriptionSegmentSchema).optional().nullable(),
  completedAt: z.string().datetime(),
  commentId: z.string().optional().nullable(),
});
export type IssueTranscriptionCompletedEvent = z.infer<
  typeof IssueTranscriptionCompletedEventSchema
>;

export const IssueAssignedEventSchema = z.object({
  issueId: z.string(),
  tenantId: z.string(),
  assigneeUserId: z.string(),
  assignedAt: z.string().datetime(),
  assignedByUserId: z.string().optional().nullable(),
});
export type IssueAssignedEvent = z.infer<typeof IssueAssignedEventSchema>;
