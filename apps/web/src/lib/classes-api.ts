import { apiClient } from "./api-client";
import { BillingInvoiceSendProgressEventSchema } from "@corely/contracts";
import type {
  CreateClassGroupInput,
  UpdateClassGroupInput,
  ListClassGroupsInput,
  ListClassGroupsOutput,
  GetClassGroupOutput,
  CreateClassSessionInput,
  UpdateClassSessionInput,
  ListClassSessionsInput,
  ListClassSessionsOutput,
  GetClassSessionOutput,
  CreateRecurringSessionsInput,
  CreateRecurringSessionsOutput,
  GenerateClassGroupSessionsInput,
  GenerateClassGroupSessionsOutput,
  ListEnrollmentsInput,
  ListEnrollmentsOutput,
  UpsertEnrollmentInput,
  UpdateEnrollmentInput,
  BulkUpsertAttendanceInput,
  GetSessionAttendanceOutput,
  BillingPreviewOutput,
  CreateBillingRunInput,
  CreateBillingRunOutput,
  ClassEnrollment,
  ClassMonthlyBillingRun,
  GetClassesBillingSettingsOutput,
  UpdateClassesBillingSettingsInput,
  UpdateClassesBillingSettingsOutput,
  BillingInvoiceSendProgress,
  BillingInvoiceSendProgressEvent,
} from "@corely/contracts";

export class ClassesApi {
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async listClassGroups(params?: ListClassGroupsInput): Promise<ListClassGroupsOutput> {
    const query = new URLSearchParams();
    if (params?.q) {
      query.append("q", params.q);
    }
    if (params?.page) {
      query.append("page", String(params.page));
    }
    if (params?.pageSize) {
      query.append("pageSize", String(params.pageSize));
    }
    if (params?.sort) {
      query.append("sort", Array.isArray(params.sort) ? params.sort[0] : params.sort);
    }
    if (params?.status) {
      query.append("status", params.status);
    }
    if (params?.subject) {
      query.append("subject", params.subject);
    }
    if (params?.level) {
      query.append("level", params.level);
    }
    if (params?.filters) {
      query.append("filters", JSON.stringify(params.filters));
    }
    const endpoint = query.toString()
      ? `/classes/class-groups?${query.toString()}`
      : "/classes/class-groups";
    return apiClient.get<ListClassGroupsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getClassGroup(id: string): Promise<GetClassGroupOutput> {
    return apiClient.get<GetClassGroupOutput>(`/classes/class-groups/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createClassGroup(input: CreateClassGroupInput): Promise<GetClassGroupOutput> {
    return apiClient.post<GetClassGroupOutput>("/classes/class-groups", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateClassGroup(id: string, input: UpdateClassGroupInput): Promise<GetClassGroupOutput> {
    return apiClient.patch<GetClassGroupOutput>(`/classes/class-groups/${id}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listSessions(params?: ListClassSessionsInput): Promise<ListClassSessionsOutput> {
    const query = new URLSearchParams();
    if (params?.q) {
      query.append("q", params.q);
    }
    if (params?.page) {
      query.append("page", String(params.page));
    }
    if (params?.pageSize) {
      query.append("pageSize", String(params.pageSize));
    }
    if (params?.sort) {
      query.append("sort", Array.isArray(params.sort) ? params.sort[0] : params.sort);
    }
    if (params?.classGroupId) {
      query.append("classGroupId", params.classGroupId);
    }
    if (params?.status) {
      query.append("status", params.status);
    }
    if (params?.dateFrom) {
      query.append("dateFrom", params.dateFrom);
    }
    if (params?.dateTo) {
      query.append("dateTo", params.dateTo);
    }
    if (params?.filters) {
      query.append("filters", JSON.stringify(params.filters));
    }
    const endpoint = query.toString()
      ? `/classes/sessions?${query.toString()}`
      : "/classes/sessions";
    return apiClient.get<ListClassSessionsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getSession(id: string): Promise<GetClassSessionOutput> {
    return apiClient.get<GetClassSessionOutput>(`/classes/sessions/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createSession(input: CreateClassSessionInput): Promise<GetClassSessionOutput> {
    return apiClient.post<GetClassSessionOutput>("/classes/sessions", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createRecurringSessions(
    input: CreateRecurringSessionsInput
  ): Promise<CreateRecurringSessionsOutput> {
    return apiClient.post<CreateRecurringSessionsOutput>("/classes/sessions/recurring", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async generateClassGroupSessions(
    classGroupId: string,
    input?: GenerateClassGroupSessionsInput
  ): Promise<GenerateClassGroupSessionsOutput> {
    return apiClient.post<GenerateClassGroupSessionsOutput>(
      `/classes/class-groups/${classGroupId}/sessions/generate`,
      input ?? {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateSession(id: string, input: UpdateClassSessionInput): Promise<GetClassSessionOutput> {
    return apiClient.patch<GetClassSessionOutput>(`/classes/sessions/${id}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listEnrollments(params?: ListEnrollmentsInput): Promise<ListEnrollmentsOutput> {
    const query = new URLSearchParams();
    if (params?.q) {
      query.append("q", params.q);
    }
    if (params?.page) {
      query.append("page", String(params.page));
    }
    if (params?.pageSize) {
      query.append("pageSize", String(params.pageSize));
    }
    if (params?.sort) {
      query.append("sort", Array.isArray(params.sort) ? params.sort[0] : params.sort);
    }
    if (params?.classGroupId) {
      query.append("classGroupId", params.classGroupId);
    }
    if (params?.studentClientId) {
      query.append("studentClientId", params.studentClientId);
    }
    if (params?.payerClientId) {
      query.append("payerClientId", params.payerClientId);
    }
    if (typeof params?.isActive === "boolean") {
      query.append("isActive", String(params.isActive));
    }
    if (params?.filters) {
      query.append("filters", JSON.stringify(params.filters));
    }
    const endpoint = query.toString()
      ? `/classes/enrollments?${query.toString()}`
      : "/classes/enrollments";
    return apiClient.get<ListEnrollmentsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertEnrollment(input: UpsertEnrollmentInput): Promise<{ enrollment: ClassEnrollment }> {
    return apiClient.post<{ enrollment: ClassEnrollment }>("/classes/enrollments", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateEnrollment(
    id: string,
    input: UpdateEnrollmentInput
  ): Promise<{ enrollment: ClassEnrollment }> {
    return apiClient.patch<{ enrollment: ClassEnrollment }>(`/classes/enrollments/${id}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getSessionAttendance(sessionId: string): Promise<GetSessionAttendanceOutput> {
    return apiClient.get<GetSessionAttendanceOutput>(`/classes/sessions/${sessionId}/attendance`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertAttendance(
    sessionId: string,
    input: BulkUpsertAttendanceInput
  ): Promise<GetSessionAttendanceOutput> {
    return apiClient.put<GetSessionAttendanceOutput>(
      `/classes/sessions/${sessionId}/attendance`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getBillingPreview(month: string): Promise<BillingPreviewOutput> {
    return apiClient.get<BillingPreviewOutput>(
      `/classes/billing/preview?month=${encodeURIComponent(month)}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async waitForBillingSendCompletion(
    month: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
      onProgress?: (progress: BillingInvoiceSendProgress | null) => void;
    }
  ): Promise<BillingPreviewOutput> {
    const timeoutMs = options?.timeoutMs ?? 90_000;
    const intervalMs = options?.intervalMs ?? 1_500;
    const startedAt = Date.now();
    let lastPreview: BillingPreviewOutput | null = null;

    while (Date.now() - startedAt < timeoutMs) {
      const preview = await this.getBillingPreview(month);
      lastPreview = preview;
      const progress = preview.invoiceSendProgress ?? null;
      options?.onProgress?.(progress);

      if (!preview.invoicesSentAt && (preview.invoiceLinks?.length ?? 0) === 0) {
        return preview;
      }

      if (progress && progress.isComplete) {
        return preview;
      }

      await this.sleep(intervalMs);
    }

    const expectedCount = lastPreview?.invoiceSendProgress?.expectedInvoiceCount ?? 0;
    const processedCount = lastPreview?.invoiceSendProgress?.processedInvoiceCount ?? 0;
    throw new Error(
      `Timed out waiting for invoice send results (${processedCount}/${expectedCount} processed).`
    );
  }

  private async waitForBillingSendCompletionViaSse(
    billingRunId: string,
    month: string,
    options?: {
      timeoutMs?: number;
      onProgress?: (progress: BillingInvoiceSendProgress | null) => void;
    }
  ): Promise<BillingPreviewOutput> {
    const timeoutMs = options?.timeoutMs ?? 90_000;

    return new Promise<BillingPreviewOutput>((resolve, reject) => {
      const abortController = new AbortController();
      let closeStream: (() => void) | null = null;
      let settled = false;

      const finish = async () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutHandle);
        abortController.abort();
        closeStream?.();
        try {
          const preview = await this.getBillingPreview(month);
          resolve(preview);
        } catch (error) {
          reject(error);
        }
      };

      const fail = (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutHandle);
        abortController.abort();
        closeStream?.();
        reject(error instanceof Error ? error : new Error("SSE stream failed"));
      };

      const timeoutHandle = setTimeout(() => {
        fail(new Error("SSE stream timed out before completion"));
      }, timeoutMs + 1_000);

      void (async () => {
        try {
          closeStream = await apiClient.subscribeSse<unknown>(
            `/classes/billing/runs/${encodeURIComponent(billingRunId)}/send-progress/stream`,
            {
              signal: abortController.signal,
              reconnect: {
                maxAttempts: 3,
                initialDelayMs: 500,
                maxDelayMs: 5_000,
              },
              onEvent: (event) => {
                if (event.event !== "billing.invoice-send-progress") {
                  return;
                }

                const parsed = BillingInvoiceSendProgressEventSchema.safeParse(event.data);
                if (!parsed.success) {
                  return;
                }

                const payload: BillingInvoiceSendProgressEvent = parsed.data;
                options?.onProgress?.(payload.progress ?? null);
                if (payload.isComplete) {
                  void finish();
                }
              },
              onError: fail,
              onClose: () => {
                if (!settled) {
                  fail(new Error("SSE stream closed before completion"));
                }
              },
            }
          );
        } catch (error) {
          fail(error);
        }
      })();
    });
  }

  async waitForBillingSendCompletionWithSse(
    billingRunId: string,
    month: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
      onProgress?: (progress: BillingInvoiceSendProgress | null) => void;
    }
  ): Promise<BillingPreviewOutput> {
    try {
      return await this.waitForBillingSendCompletionViaSse(billingRunId, month, {
        timeoutMs: options?.timeoutMs,
        onProgress: options?.onProgress,
      });
    } catch {
      return this.waitForBillingSendCompletion(month, options);
    }
  }

  async createBillingRun(input: CreateBillingRunInput): Promise<CreateBillingRunOutput> {
    return apiClient.post<CreateBillingRunOutput>("/classes/billing/runs", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async lockBillingRun(id: string): Promise<{ billingRun: ClassMonthlyBillingRun }> {
    return apiClient.post<{ billingRun: ClassMonthlyBillingRun }>(
      `/classes/billing/runs/${id}/lock`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getSettings(): Promise<GetClassesBillingSettingsOutput> {
    return apiClient.get<GetClassesBillingSettingsOutput>("/classes/settings", {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateSettings(
    input: UpdateClassesBillingSettingsInput
  ): Promise<UpdateClassesBillingSettingsOutput> {
    return apiClient.patch<UpdateClassesBillingSettingsOutput>("/classes/settings", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const classesApi = new ClassesApi();
