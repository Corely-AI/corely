import type { IssueAttachment } from "../../domain/issue.types";

export interface IssueAttachmentRepositoryPort {
  createMany(attachments: IssueAttachment[]): Promise<void>;
  listByIssue(tenantId: string, issueId: string): Promise<IssueAttachment[]>;
  listByComment(tenantId: string, commentId: string): Promise<IssueAttachment[]>;
  update(tenantId: string, attachmentId: string, updates: Partial<IssueAttachment>): Promise<void>;
}

export const ISSUE_ATTACHMENT_REPOSITORY_PORT = "issues/issue-attachment-repository";
