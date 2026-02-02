import type { IssueComment } from "../../domain/issue.types";

export interface IssueCommentRepositoryPort {
  create(comment: IssueComment): Promise<IssueComment>;
  listByIssue(tenantId: string, issueId: string): Promise<IssueComment[]>;
}

export const ISSUE_COMMENT_REPOSITORY_PORT = "issues/issue-comment-repository";
