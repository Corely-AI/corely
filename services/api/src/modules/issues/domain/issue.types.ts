export type IssueStatus =
  | "NEW"
  | "TRIAGED"
  | "IN_PROGRESS"
  | "WAITING"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type IssueSiteType = "FIELD" | "CUSTOMER" | "MANUFACTURER";

export type IssueAttachmentKind = "IMAGE" | "AUDIO";

export type IssueTranscriptionStatus = "PENDING" | "COMPLETED" | "FAILED";

export type IssueTranscriptionSegment = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type Issue = {
  id: string;
  tenantId: string;
  title: string;
  description?: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  siteType: IssueSiteType;
  siteId?: string | null;
  customerPartyId?: string | null;
  manufacturerPartyId?: string | null;
  assigneeUserId?: string | null;
  reporterUserId?: string | null;
  resolvedAt?: Date | null;
  resolvedByUserId?: string | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IssueComment = {
  id: string;
  issueId: string;
  tenantId: string;
  body: string;
  createdByUserId: string;
  createdAt: Date;
};

export type IssueAttachment = {
  id: string;
  issueId: string;
  tenantId: string;
  commentId?: string | null;
  documentId: string;
  fileId?: string;
  kind: IssueAttachmentKind;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  transcriptText?: string | null;
  transcriptSegments?: IssueTranscriptionSegment[] | null;
  transcriptionStatus?: IssueTranscriptionStatus | null;
  transcriptionError?: string | null;
  createdAt: Date;
  createdByUserId?: string | null;
};

export type IssueActivityType =
  | "CREATED"
  | "COMMENT_ADDED"
  | "STATUS_CHANGED"
  | "ATTACHMENT_ADDED"
  | "RESOLVED"
  | "REOPENED"
  | "ASSIGNED";

export type IssueActivity = {
  id: string;
  issueId: string;
  tenantId: string;
  type: IssueActivityType;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  createdByUserId?: string | null;
};
