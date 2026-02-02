import type { IssueActivity } from "../../domain/issue.types";

export interface IssueActivityRepositoryPort {
  create(activity: IssueActivity): Promise<IssueActivity>;
  listByIssue(tenantId: string, issueId: string): Promise<IssueActivity[]>;
}

export const ISSUE_ACTIVITY_REPOSITORY_PORT = "issues/issue-activity-repository";
