import { Injectable, Inject } from "@nestjs/common";
import { TEACHER_DASHBOARD_QUERY } from "../ports/teacher-dashboard-query.port";
import type { TeacherDashboardQueryPort } from "../ports/teacher-dashboard-query.port";
import type { UseCaseContext } from "@corely/kernel";
import {
  type TeacherDashboardUnpaidInvoicesQuery,
  type TeacherDashboardUnpaidInvoicesResponse,
} from "@corely/contracts/classes";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanTeacherDashboardView } from "../../policies/assert-can-classes";

@Injectable()
export class GetTeacherDashboardUnpaidInvoicesUseCase {
  constructor(
    @Inject(TEACHER_DASHBOARD_QUERY)
    private readonly teacherDashboardQuery: TeacherDashboardQueryPort
  ) {}

  async execute(
    ctx: UseCaseContext,
    query: TeacherDashboardUnpaidInvoicesQuery
  ): Promise<TeacherDashboardUnpaidInvoicesResponse> {
    assertCanTeacherDashboardView(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);
    return this.teacherDashboardQuery.getUnpaidInvoices(tenantId, workspaceId, query);
  }
}
