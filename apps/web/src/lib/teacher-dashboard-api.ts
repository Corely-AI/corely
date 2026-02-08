import { apiClient } from "@/lib/api-client";
import type {
  TeacherDashboardSummaryQuery,
  TeacherDashboardSummaryResponse,
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
};
