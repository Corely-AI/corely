import { apiClient } from "@corely/web-shared/lib/api-client";
import type {
  TeacherDashboardSummaryQuery,
  TeacherDashboardSummaryResponse,
  TeacherDashboardUnpaidInvoicesResponse,
} from "@corely/contracts";

export const teacherDashboardApi = {
  getSummary: async (
    query: TeacherDashboardSummaryQuery
  ): Promise<TeacherDashboardSummaryResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.append("dateFrom", query.dateFrom);
    searchParams.append("dateTo", query.dateTo);
    if (query.classGroupId) {
      searchParams.append("classGroupId", query.classGroupId);
    }

    return apiClient.get<TeacherDashboardSummaryResponse>(
      `/classes/teacher/dashboard/summary?${searchParams.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  },

  getUnpaidInvoices: async (
    query: Pick<TeacherDashboardSummaryQuery, "classGroupId">
  ): Promise<TeacherDashboardUnpaidInvoicesResponse> => {
    const searchParams = new URLSearchParams();
    if (query.classGroupId) {
      searchParams.append("classGroupId", query.classGroupId);
    }

    return apiClient.get<TeacherDashboardUnpaidInvoicesResponse>(
      `/classes/teacher/dashboard/unpaid-invoices?${searchParams.toString()}`,
      { correlationId: apiClient.generateCorrelationId() }
    );
  },
};
