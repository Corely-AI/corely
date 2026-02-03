import { z } from "zod";

export const IssueStatusSchema = z.enum([
  "NEW",
  "TRIAGED",
  "IN_PROGRESS",
  "WAITING",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
]);
export type IssueStatus = z.infer<typeof IssueStatusSchema>;

export const IssuePrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type IssuePriority = z.infer<typeof IssuePrioritySchema>;

export const IssueSiteTypeSchema = z.enum(["FIELD", "CUSTOMER", "MANUFACTURER"]);
export type IssueSiteType = z.infer<typeof IssueSiteTypeSchema>;

export const IssueAttachmentKindSchema = z.enum(["IMAGE", "AUDIO"]);
export type IssueAttachmentKind = z.infer<typeof IssueAttachmentKindSchema>;

export const IssueTranscriptionStatusSchema = z.enum(["PENDING", "COMPLETED", "FAILED"]);
export type IssueTranscriptionStatus = z.infer<typeof IssueTranscriptionStatusSchema>;

export const AttachmentMetadataSchema = z.object({
  documentId: z.string().min(1),
  kind: IssueAttachmentKindSchema,
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().nonnegative().optional(),
});
export type AttachmentMetadata = z.infer<typeof AttachmentMetadataSchema>;

export const IssueTranscriptionSegmentSchema = z.object({
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().nonnegative(),
  text: z.string(),
});
export type IssueTranscriptionSegment = z.infer<typeof IssueTranscriptionSegmentSchema>;

export const IssueAttachmentSchema = AttachmentMetadataSchema.extend({
  id: z.string(),
  fileId: z.string().optional(),
  issueId: z.string(),
  commentId: z.string().optional().nullable(),
  transcriptText: z.string().optional().nullable(),
  transcriptSegments: z.array(IssueTranscriptionSegmentSchema).optional().nullable(),
  transcriptionStatus: IssueTranscriptionStatusSchema.optional().nullable(),
  createdAt: z.string().datetime(),
  createdByUserId: z.string().optional().nullable(),
});
export type IssueAttachment = z.infer<typeof IssueAttachmentSchema>;

export const IssueCommentSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  body: z.string(),
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
  attachments: z.array(IssueAttachmentSchema).optional(),
});
export type IssueComment = z.infer<typeof IssueCommentSchema>;

export const IssueActivityTypeSchema = z.enum([
  "CREATED",
  "COMMENT_ADDED",
  "STATUS_CHANGED",
  "ATTACHMENT_ADDED",
  "RESOLVED",
  "REOPENED",
  "ASSIGNED",
]);
export type IssueActivityType = z.infer<typeof IssueActivityTypeSchema>;

export const IssueActivitySchema = z.object({
  id: z.string(),
  issueId: z.string(),
  type: IssueActivityTypeSchema,
  createdAt: z.string().datetime(),
  createdByUserId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});
export type IssueActivity = z.infer<typeof IssueActivitySchema>;

export const IssueSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  status: IssueStatusSchema,
  priority: IssuePrioritySchema.optional().nullable(),
  siteType: IssueSiteTypeSchema,
  siteId: z.string().optional().nullable(),
  customerPartyId: z.string().optional().nullable(),
  manufacturerPartyId: z.string().optional().nullable(),
  assigneeUserId: z.string().optional().nullable(),
  reporterUserId: z.string().optional().nullable(),
  resolvedAt: z.string().datetime().optional().nullable(),
  resolvedByUserId: z.string().optional().nullable(),
  closedAt: z.string().datetime().optional().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  attachments: z.array(IssueAttachmentSchema).optional(),
});
export type Issue = z.infer<typeof IssueSchema>;
