import type { Issue, IssuePriority, IssueSiteType, IssueStatus } from "../../domain/issue.types";

export type IssueListFilters = {
  q?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  siteType?: IssueSiteType;
  assigneeUserId?: string;
  reporterUserId?: string;
  customerPartyId?: string;
  manufacturerPartyId?: string;
  fromDate?: string;
  toDate?: string;
  sort?: string | string[];
  structuredFilters?: unknown;
};

export type IssueListResult = {
  items: Issue[];
  total: number;
};

export interface IssueRepositoryPort {
  create(issue: Issue): Promise<Issue>;
  update(tenantId: string, issueId: string, updates: Partial<Issue>): Promise<Issue>;
  findById(tenantId: string, issueId: string): Promise<Issue | null>;
  list(
    tenantId: string,
    filters: IssueListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<IssueListResult>;
}

export const ISSUE_REPOSITORY_PORT = "issues/issue-repository";
