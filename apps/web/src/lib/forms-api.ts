/**
 * Forms API Client
 */

import type {
  AddFieldInput,
  CreateFormInput,
  FormDefinitionDto,
  FormSubmissionDto,
  ListFormsInput,
  ListFormsOutput,
  ListFormSubmissionsInput,
  ListFormSubmissionsOutput,
  PublishFormInput,
  PublishFormOutput,
  PublicFormDto,
  PublicSubmitInput,
  PublicSubmitOutput,
  UpdateFieldInput,
  UpdateFormInput,
  FormSubmissionSummary,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";
import { request } from "@corely/api-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

export const resolveFormsApiBaseUrl = () =>
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "http://localhost:3000");

const requestPublic = async <T>(endpoint: string, opts?: { method?: string; body?: unknown }) => {
  const workspaceId = getActiveWorkspaceId();
  return request<T>({
    url: `${resolveFormsApiBaseUrl()}${endpoint}`,
    method: opts?.method ?? "GET",
    body: opts?.body,
    workspaceId: workspaceId ?? null,
  });
};

export type ListFormsParams = ListFormsInput & {
  status?: ListFormsInput["status"];
};

export class FormsApi {
  async listForms(params: ListFormsParams = {}): Promise<ListFormsOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString() ? `/forms?${query.toString()}` : "/forms";
    return apiClient.get<ListFormsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createForm(input: CreateFormInput): Promise<FormDefinitionDto> {
    const result = await apiClient.post<{ form: FormDefinitionDto }>("/forms", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.form;
  }

  async getForm(formId: string): Promise<FormDefinitionDto> {
    const result = await apiClient.get<{ form: FormDefinitionDto }>(`/forms/${formId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.form;
  }

  async updateForm(formId: string, input: UpdateFormInput): Promise<FormDefinitionDto> {
    const result = await apiClient.patch<{ form: FormDefinitionDto }>(`/forms/${formId}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.form;
  }

  async deleteForm(formId: string): Promise<void> {
    await apiClient.delete(`/forms/${formId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async addField(formId: string, input: AddFieldInput): Promise<FormDefinitionDto> {
    const result = await apiClient.post<{ form: FormDefinitionDto }>(
      `/forms/${formId}/fields`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.form;
  }

  async updateField(
    formId: string,
    fieldId: string,
    input: UpdateFieldInput
  ): Promise<FormDefinitionDto> {
    const result = await apiClient.patch<{ form: FormDefinitionDto }>(
      `/forms/${formId}/fields/${fieldId}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.form;
  }

  async removeField(formId: string, fieldId: string): Promise<FormDefinitionDto> {
    const result = await apiClient.delete<{ form: FormDefinitionDto }>(
      `/forms/${formId}/fields/${fieldId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.form;
  }

  async reorderFields(formId: string, fieldIds: string[]): Promise<FormDefinitionDto> {
    const result = await apiClient.post<{ form: FormDefinitionDto }>(
      `/forms/${formId}/fields/reorder`,
      { fieldIds },
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.form;
  }

  async publishForm(formId: string, input: PublishFormInput = {}): Promise<PublishFormOutput> {
    return apiClient.post<PublishFormOutput>(`/forms/${formId}/publish`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async unpublishForm(formId: string): Promise<FormDefinitionDto> {
    const result = await apiClient.post<{ form: FormDefinitionDto }>(
      `/forms/${formId}/unpublish`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.form;
  }

  async listSubmissions(
    formId: string,
    params: ListFormSubmissionsInput = {}
  ): Promise<ListFormSubmissionsOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString()
      ? `/forms/${formId}/submissions?${query.toString()}`
      : `/forms/${formId}/submissions`;
    return apiClient.get<ListFormSubmissionsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getSubmission(formId: string, submissionId: string): Promise<FormSubmissionDto> {
    const result = await apiClient.get<{ submission: FormSubmissionDto }>(
      `/forms/${formId}/submissions/${submissionId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.submission;
  }

  async getSubmissionSummary(formId: string, last?: number): Promise<FormSubmissionSummary> {
    const query = typeof last === "number" ? `?last=${last}` : "";
    return apiClient.get<FormSubmissionSummary>(`/forms/${formId}/submissions/summary${query}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getPublicForm(publicId: string): Promise<PublicFormDto> {
    const result = await requestPublic<{ form: PublicFormDto }>(`/public/forms/${publicId}`);
    return result.form;
  }

  async submitPublicForm(publicId: string, input: PublicSubmitInput): Promise<PublicSubmitOutput> {
    return requestPublic<PublicSubmitOutput>(`/public/forms/${publicId}/submissions`, {
      method: "POST",
      body: input,
    });
  }
}

export const formsApi = new FormsApi();

export const buildFormPublicLink = (publicId: string) => `/f/${publicId}`;
