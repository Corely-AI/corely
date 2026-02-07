import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { Request } from "express";
import { GetDashboardReportUseCase } from "../../application/use-cases/get-dashboard-report.usecase";
import { GetMonthlyPackUseCase } from "../../application/use-cases/get-monthly-pack.usecase";
import { GetMonthlyPackInputSchema, type GetMonthlyPackOutput } from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";

const DashboardQuerySchema = z.object({
  tenantId: z.string().min(1),
});

// Helper to build use case context from request
function buildUseCaseContext(req: Request) {
  return {
    tenantId: (req as any).tenantId || (req as any).context?.tenantId,
    userId: (req as any).userId || (req as any).context?.userId,
    workspaceId: (req as any).workspaceId || (req as any).context?.workspaceId,
    correlationId: (req as any).correlationId,
    requestId: (req as any).requestId,
  };
}

@Controller("reports")
export class ReportingController {
  constructor(
    @Inject(GetDashboardReportUseCase)
    private readonly getDashboardReport: GetDashboardReportUseCase,
    private readonly getMonthlyPack: GetMonthlyPackUseCase
  ) {}

  @Get("dashboard")
  async dashboard(@Query() query: unknown) {
    const { tenantId } = DashboardQuerySchema.parse(query);
    const report = await this.getDashboardReport.execute(tenantId);
    return { ...report, message: "Reporting context - dashboard" };
  }

  @Get("monthly-pack")
  @UseGuards(AuthGuard)
  async monthlyPack(@Query() query: unknown, @Req() req: Request): Promise<GetMonthlyPackOutput> {
    const input = GetMonthlyPackInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const result = await this.getMonthlyPack.execute(input, ctx);

    if (!result.ok) {
      throw result.error;
    }

    return result.value;
  }
}
