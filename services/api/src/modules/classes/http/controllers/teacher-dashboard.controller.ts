import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import {
  TeacherDashboardSummaryQuerySchema,
  TeacherDashboardUnpaidInvoicesQuerySchema,
  type TeacherDashboardSummaryResponse,
  type TeacherDashboardUnpaidInvoicesResponse,
} from "@corely/contracts/classes";

import { GetTeacherDashboardSummaryUseCase } from "../../application/use-cases/get-teacher-dashboard-summary.use-case";
import { AuthGuard, RbacGuard, RequirePermission } from "../../../identity";
import { buildUseCaseContext } from "../../../../shared/http/usecase-mappers";
import type { Request } from "express";

import { GetTeacherDashboardUnpaidInvoicesUseCase } from "../../application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";

@Controller("classes/teacher/dashboard")
@UseGuards(AuthGuard, RbacGuard)
export class TeacherDashboardController {
  constructor(
    private readonly getSummaryUseCase: GetTeacherDashboardSummaryUseCase,
    private readonly getUnpaidInvoicesUseCase: GetTeacherDashboardUnpaidInvoicesUseCase
  ) {}

  @Get("summary")
  @RequirePermission("classes.teacher.dashboard.view")
  async getSummary(
    @Req() req: Request,
    @Query() query: unknown
  ): Promise<TeacherDashboardSummaryResponse> {
    const input = TeacherDashboardSummaryQuerySchema.parse(query);
    const ctx = buildUseCaseContext(req);
    return this.getSummaryUseCase.execute(ctx, input);
  }

  @Get("unpaid-invoices")
  @RequirePermission("classes.teacher.dashboard.view")
  async getUnpaidInvoices(
    @Req() req: Request,
    @Query() query: unknown
  ): Promise<TeacherDashboardUnpaidInvoicesResponse> {
    const input = TeacherDashboardUnpaidInvoicesQuerySchema.parse(query);
    const ctx = buildUseCaseContext(req);
    return this.getUnpaidInvoicesUseCase.execute(ctx, input);
  }
}
