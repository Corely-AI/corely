import type { Issue, IssuePriority, IssueSiteType, IssueStatus } from "../../domain/issue.types";

import type { TransactionContext } from "@corely/kernel";

export type IssueListFilters = {
  workspaceId?: string;
  ownerOnly?: string;
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
  finishClientUpdate(issue: Issue, status: "SENT" | "FAILED" | "NEEDS_REVIEW"): Promise<void>;
  insertRequest(issue: Issue, tx: TransactionContext): Promise<boolean>;
  queueClientUpdate(
    issue: Issue,
    summary: string,
    now: Date,
    tx: TransactionContext
  ): Promise<boolean>;
  create(issue: Issue): Promise<Issue>;
  update(tenantId: string, issueId: string, updates: Partial<Issue>): Promise<Issue>;
  findById(tenantId: string, issueId: string, workspaceId?: string): Promise<Issue | null>;
  list(
    tenantId: string,
    filters: IssueListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<IssueListResult>;
}

export const ISSUE_REPOSITORY_PORT = "issues/issue-repository";
