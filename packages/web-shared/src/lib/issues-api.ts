import type {
  AddIssueCommentRequest,
  AddIssueCommentResponse,
  AssignIssueRequest,
  AssignIssueResponse,
  ChangeIssueStatusRequest,
  ChangeIssueStatusResponse,
  CreateIssueRequest,
  CreateIssueResponse,
  GetIssueResponse,
  ListIssuesRequest,
  ListIssuesResponse,
  ReopenIssueResponse,
  ResolveIssueRequest,
  ResolveIssueResponse,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

export class IssuesApi {
  async listIssues(params: ListIssuesRequest): Promise<ListIssuesResponse> {
    const query = buildListQuery(params);
    const endpoint = query.toString() ? `/issues?${query.toString()}` : "/issues";
    return apiClient.get<ListIssuesResponse>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createIssue(input: CreateIssueRequest): Promise<CreateIssueResponse["issue"]> {
    const result = await apiClient.post<CreateIssueResponse>("/issues", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.issue;
  }

  async getIssue(issueId: string): Promise<GetIssueResponse> {
    return apiClient.get<GetIssueResponse>(`/issues/${issueId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async addComment(input: AddIssueCommentRequest): Promise<AddIssueCommentResponse["comment"]> {
    const result = await apiClient.post<AddIssueCommentResponse>(
      `/issues/${input.issueId}/comments`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.comment;
  }

  async changeStatus(input: ChangeIssueStatusRequest): Promise<ChangeIssueStatusResponse["issue"]> {
    const result = await apiClient.post<ChangeIssueStatusResponse>(
      `/issues/${input.issueId}/status`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.issue;
  }

  async resolveIssue(input: ResolveIssueRequest): Promise<ResolveIssueResponse["issue"]> {
    const result = await apiClient.post<ResolveIssueResponse>(
      `/issues/${input.issueId}/resolve`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.issue;
  }

  async reopenIssue(issueId: string, note?: string): Promise<ReopenIssueResponse["issue"]> {
    const result = await apiClient.post<ReopenIssueResponse>(
      `/issues/${issueId}/reopen`,
      { note },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.issue;
  }

  async assignIssue(input: AssignIssueRequest): Promise<AssignIssueResponse["issue"]> {
    const result = await apiClient.post<AssignIssueResponse>(
      `/issues/${input.issueId}/assign`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.issue;
  }
}

export const issuesApi = new IssuesApi();
