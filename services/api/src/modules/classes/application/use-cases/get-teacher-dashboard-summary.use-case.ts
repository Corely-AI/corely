import { Injectable, Inject } from "@nestjs/common";
import { TEACHER_DASHBOARD_QUERY } from "../ports/teacher-dashboard-query.port";
import { CLASSES_SETTINGS_REPOSITORY_PORT } from "../ports/classes-settings-repository.port";
import type { TeacherDashboardQueryPort } from "../ports/teacher-dashboard-query.port";
import type { ClassesSettingsRepositoryPort } from "../ports/classes-settings-repository.port";
import type { UseCaseContext } from "@corely/kernel";
import {
  type TeacherDashboardSummaryQuery,
  type TeacherDashboardSummaryResponse,
} from "@corely/contracts";
import { DEFAULT_PREPAID_SETTINGS, normalizeBillingSettings } from "../helpers/billing-settings";
import { resolveTenantScope } from "../helpers/resolve-scope";
import { assertCanTeacherDashboardView } from "../../policies/assert-can-classes";

@Injectable()
export class GetTeacherDashboardSummaryUseCase {
  constructor(
    @Inject(TEACHER_DASHBOARD_QUERY)
    private readonly teacherDashboardQuery: TeacherDashboardQueryPort,
    @Inject(CLASSES_SETTINGS_REPOSITORY_PORT)
    private readonly settingsRepo: ClassesSettingsRepositoryPort
  ) {}

  async execute(
    ctx: UseCaseContext,
    query: TeacherDashboardSummaryQuery
  ): Promise<TeacherDashboardSummaryResponse> {
    assertCanTeacherDashboardView(ctx);
    const { tenantId, workspaceId } = resolveTenantScope(ctx);

    // Fetch settings to determine attendance mode
    const settings = normalizeBillingSettings(
      (await this.settingsRepo.getSettings(tenantId, workspaceId)) ?? DEFAULT_PREPAID_SETTINGS
    );

    const summary = await this.teacherDashboardQuery.getSummary(tenantId, workspaceId, query);

    return {
      ...summary,
      attendanceMode: settings.attendanceMode,
    };
  }
}
