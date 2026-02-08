import {
  type TeacherDashboardSummaryQuery,
  type TeacherDashboardSummaryResponse,
  type TeacherDashboardUnpaidInvoicesResponse,
  type TeacherDashboardUnpaidInvoicesQuery,
} from "@corely/contracts/classes";

export interface TeacherDashboardQueryPort {
  getSummary(
    tenantId: string,
    workspaceId: string,
    query: TeacherDashboardSummaryQuery
  ): Promise<TeacherDashboardSummaryResponse>;

  getUnpaidInvoices(
    tenantId: string,
    workspaceId: string,
    query: TeacherDashboardUnpaidInvoicesQuery
  ): Promise<TeacherDashboardUnpaidInvoicesResponse>;
}

export const TEACHER_DASHBOARD_QUERY = "classes/teacher-dashboard-query";
