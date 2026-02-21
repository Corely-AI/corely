import { apiClient } from "./api-client";
import { BillingInvoiceSendProgressEventSchema } from "@corely/contracts";
import type {
  ApproveApplicationInput,
  CreateClassGroupInput,
  CreateClassGroupResourceInput,
  UpdateClassGroupInput,
  UpdateClassGroupResourceInput,
  ListClassGroupsInput,
  ListClassGroupsOutput,
  ListClassGroupResourcesOutput,
  ListMilestonesOutput,
  ListProgramsInput,
  ListProgramsOutput,
  GetClassGroupOutput,
  CreateClassSessionInput,
  UpdateClassSessionInput,
  ListClassSessionsInput,
  ListClassSessionsOutput,
  GetClassSessionOutput,
  CreateProgramInput,
  CreateCohortFromProgramInput,
  CreateCohortFromProgramOutput,
  ProgramDetail,
  CreateRecurringSessionsInput,
  CreateRecurringSessionsOutput,
  GenerateClassGroupSessionsInput,
  GenerateClassGroupSessionsOutput,
  ListEnrollmentsInput,
  ListEnrollmentsOutput,
  UpsertEnrollmentInput,
  UpdateEnrollmentInput,
  CreateApplicationInput,
  BulkUpsertAttendanceInput,
  GetSessionAttendanceOutput,
  BillingPreviewOutput,
  GenerateBillingPlanInvoicesInput,
  GenerateBillingPlanInvoicesOutput,
  GetEnrollmentBillingPlanOutput,
  GetOutcomesSummaryOutput,
  CreateBillingRunInput,
  CreateBillingRunOutput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  UpdateProgramInput,
  UpdateCohortLifecycleInput,
  UpsertCohortTeamInput,
  UpsertEnrollmentBillingPlanInput,
  UpsertMilestoneCompletionInput,
  ReorderClassGroupResourcesInput,
  ClassEnrollment,
  ClassGroup,
  ClassGroupInstructorsOutput,
  ClassMilestone,
  ClassMilestoneCompletion,
  ClassGroupResource,
  ClassEnrollmentBillingPlan,
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
    if (params?.kind) {
      query.append("kind", params.kind);
    }
    if (params?.lifecycle) {
      query.append("lifecycle", params.lifecycle);
    }
    if (params?.startAtFrom) {
      query.append("startAtFrom", params.startAtFrom);
    }
    if (params?.startAtTo) {
      query.append("startAtTo", params.startAtTo);
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
    if (params?.type) {
      query.append("type", params.type);
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
    if (params?.payerPartyId) {
      query.append("payerPartyId", params.payerPartyId);
    }
    if (params?.status) {
      query.append("status", params.status);
    }
    if (params?.seatType) {
      query.append("seatType", params.seatType);
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

  async getBillingPreview(
    month: string,
    filters?: { classGroupId?: string; payerClientId?: string }
  ): Promise<BillingPreviewOutput> {
    const query = new URLSearchParams({ month });
    if (filters?.classGroupId) {
      query.append("classGroupId", filters.classGroupId);
    }
    if (filters?.payerClientId) {
      query.append("payerClientId", filters.payerClientId);
    }
    return apiClient.get<BillingPreviewOutput>(`/classes/billing/preview?${query.toString()}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
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

  async listPrograms(params?: ListProgramsInput): Promise<ListProgramsOutput> {
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
    if (params?.levelTag) {
      query.append("levelTag", params.levelTag);
    }
    if (params?.filters) {
      query.append("filters", JSON.stringify(params.filters));
    }

    const endpoint = query.toString()
      ? `/classes/programs?${query.toString()}`
      : "/classes/programs";
    return apiClient.get<ListProgramsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createProgram(input: CreateProgramInput): Promise<ProgramDetail> {
    return apiClient.post<ProgramDetail>("/classes/programs", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getProgram(programId: string): Promise<ProgramDetail> {
    return apiClient.get<ProgramDetail>(`/classes/programs/${programId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateProgram(programId: string, input: UpdateProgramInput): Promise<ProgramDetail> {
    return apiClient.patch<ProgramDetail>(`/classes/programs/${programId}`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createCohortFromProgram(
    programId: string,
    input: CreateCohortFromProgramInput
  ): Promise<CreateCohortFromProgramOutput> {
    return apiClient.post<CreateCohortFromProgramOutput>(
      `/classes/programs/${programId}/create-cohort`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateCohortLifecycle(
    classGroupId: string,
    input: UpdateCohortLifecycleInput
  ): Promise<{ classGroup: ClassGroup }> {
    return apiClient.post<{ classGroup: ClassGroup }>(
      `/classes/class-groups/${classGroupId}/lifecycle`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getCohortTeam(classGroupId: string): Promise<ClassGroupInstructorsOutput> {
    return apiClient.get<ClassGroupInstructorsOutput>(
      `/classes/class-groups/${classGroupId}/team`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async upsertCohortTeam(
    classGroupId: string,
    input: UpsertCohortTeamInput
  ): Promise<ClassGroupInstructorsOutput> {
    return apiClient.put<ClassGroupInstructorsOutput>(
      `/classes/class-groups/${classGroupId}/team`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async createApplication(
    classGroupId: string,
    input: CreateApplicationInput
  ): Promise<{ enrollment: ClassEnrollment }> {
    return apiClient.post<{ enrollment: ClassEnrollment }>(
      `/classes/class-groups/${classGroupId}/applications`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async approveApplication(
    enrollmentId: string,
    input: ApproveApplicationInput
  ): Promise<{ enrollment: ClassEnrollment }> {
    return apiClient.post<{ enrollment: ClassEnrollment }>(
      `/classes/enrollments/${enrollmentId}/approve`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getEnrollmentBillingPlan(enrollmentId: string): Promise<GetEnrollmentBillingPlanOutput> {
    return apiClient.get<GetEnrollmentBillingPlanOutput>(
      `/classes/enrollments/${enrollmentId}/billing-plan`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async upsertEnrollmentBillingPlan(
    enrollmentId: string,
    input: UpsertEnrollmentBillingPlanInput
  ): Promise<{ billingPlan: ClassEnrollmentBillingPlan }> {
    return apiClient.put<{ billingPlan: ClassEnrollmentBillingPlan }>(
      `/classes/enrollments/${enrollmentId}/billing-plan`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async generateBillingPlanInvoices(
    enrollmentId: string,
    input: GenerateBillingPlanInvoicesInput
  ): Promise<GenerateBillingPlanInvoicesOutput> {
    return apiClient.post<GenerateBillingPlanInvoicesOutput>(
      `/classes/enrollments/${enrollmentId}/billing-plan/generate-invoices`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listMilestones(classGroupId: string): Promise<ListMilestonesOutput> {
    return apiClient.get<ListMilestonesOutput>(`/classes/class-groups/${classGroupId}/milestones`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createMilestone(
    classGroupId: string,
    input: CreateMilestoneInput
  ): Promise<{ milestone: ClassMilestone }> {
    return apiClient.post<{ milestone: ClassMilestone }>(
      `/classes/class-groups/${classGroupId}/milestones`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateMilestone(
    milestoneId: string,
    input: UpdateMilestoneInput
  ): Promise<{ milestone: ClassMilestone }> {
    return apiClient.patch<{ milestone: ClassMilestone }>(
      `/classes/milestones/${milestoneId}`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async deleteMilestone(milestoneId: string): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/classes/milestones/${milestoneId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertMilestoneCompletion(
    milestoneId: string,
    enrollmentId: string,
    input: UpsertMilestoneCompletionInput
  ): Promise<{ completion: ClassMilestoneCompletion }> {
    return apiClient.put<{ completion: ClassMilestoneCompletion }>(
      `/classes/milestones/${milestoneId}/completions/${enrollmentId}`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getOutcomesSummary(classGroupId: string): Promise<GetOutcomesSummaryOutput> {
    return apiClient.get<GetOutcomesSummaryOutput>(
      `/classes/class-groups/${classGroupId}/outcomes-summary`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listResources(classGroupId: string): Promise<ListClassGroupResourcesOutput> {
    return apiClient.get<ListClassGroupResourcesOutput>(
      `/classes/class-groups/${classGroupId}/resources`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async createResource(
    classGroupId: string,
    input: CreateClassGroupResourceInput
  ): Promise<{ resource: ClassGroupResource }> {
    return apiClient.post<{ resource: ClassGroupResource }>(
      `/classes/class-groups/${classGroupId}/resources`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async updateResource(
    resourceId: string,
    input: UpdateClassGroupResourceInput
  ): Promise<{ resource: ClassGroupResource }> {
    return apiClient.patch<{ resource: ClassGroupResource }>(
      `/classes/resources/${resourceId}`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async deleteResource(resourceId: string): Promise<{ ok: boolean }> {
    return apiClient.delete<{ ok: boolean }>(`/classes/resources/${resourceId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async reorderResources(
    classGroupId: string,
    input: ReorderClassGroupResourcesInput
  ): Promise<{ ok: boolean }> {
    return apiClient.put<{ ok: boolean }>(
      `/classes/class-groups/${classGroupId}/resources/reorder`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const classesApi = new ClassesApi();
