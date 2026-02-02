import type {
  Issue as IssueDto,
  IssueActivity as IssueActivityDto,
  IssueAttachment as IssueAttachmentDto,
  IssueComment as IssueCommentDto,
} from "@corely/contracts";
import type {
  Issue,
  IssueActivity,
  IssueAttachment,
  IssueComment,
  IssueTranscriptionSegment,
} from "../../domain/issue.types";

const toSegmentDto = (segment: IssueTranscriptionSegment) => ({
  startSeconds: segment.startSeconds,
  endSeconds: segment.endSeconds,
  text: segment.text,
});

export const toIssueAttachmentDto = (attachment: IssueAttachment): IssueAttachmentDto => ({
  id: attachment.id,
  issueId: attachment.issueId,
  commentId: attachment.commentId ?? null,
  documentId: attachment.documentId,
  fileId: attachment.fileId ?? undefined,
  kind: attachment.kind,
  mimeType: attachment.mimeType,
  sizeBytes: attachment.sizeBytes,
  durationSeconds: attachment.durationSeconds ?? undefined,
  transcriptText: attachment.transcriptText ?? null,
  transcriptSegments: attachment.transcriptSegments
    ? attachment.transcriptSegments.map(toSegmentDto)
    : null,
  transcriptionStatus: attachment.transcriptionStatus ?? null,
  createdAt: attachment.createdAt.toISOString(),
  createdByUserId: attachment.createdByUserId ?? null,
});

export const toIssueCommentDto = (
  comment: IssueComment,
  attachments: IssueAttachment[] = []
): IssueCommentDto => ({
  id: comment.id,
  issueId: comment.issueId,
  body: comment.body,
  createdByUserId: comment.createdByUserId,
  createdAt: comment.createdAt.toISOString(),
  attachments: attachments.length ? attachments.map(toIssueAttachmentDto) : undefined,
});

export const toIssueActivityDto = (activity: IssueActivity): IssueActivityDto => ({
  id: activity.id,
  issueId: activity.issueId,
  type: activity.type,
  createdAt: activity.createdAt.toISOString(),
  createdByUserId: activity.createdByUserId ?? null,
  metadata: activity.metadata ?? null,
});

export const toIssueDto = (issue: Issue, attachments?: IssueAttachment[]): IssueDto => ({
  id: issue.id,
  tenantId: issue.tenantId,
  title: issue.title,
  description: issue.description ?? null,
  status: issue.status,
  priority: issue.priority,
  siteType: issue.siteType,
  siteId: issue.siteId ?? null,
  customerPartyId: issue.customerPartyId ?? null,
  manufacturerPartyId: issue.manufacturerPartyId ?? null,
  assigneeUserId: issue.assigneeUserId ?? null,
  reporterUserId: issue.reporterUserId ?? null,
  resolvedAt: issue.resolvedAt?.toISOString() ?? null,
  resolvedByUserId: issue.resolvedByUserId ?? null,
  closedAt: issue.closedAt?.toISOString() ?? null,
  createdAt: issue.createdAt.toISOString(),
  updatedAt: issue.updatedAt.toISOString(),
  attachments: attachments ? attachments.map(toIssueAttachmentDto) : undefined,
});
