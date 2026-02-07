import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { GetDashboardReportUseCase } from "../../application/use-cases/get-dashboard-report.usecase";
import { GetMonthlyPackUseCase } from "../../application/use-cases/get-monthly-pack.usecase";
import { GetMonthlyPackInputSchema, type GetMonthlyPackOutput } from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { Context } from "../../../shared/decorators/context.decorator";
import type { UseCaseContext } from "@corely/kernel";

const DashboardQuerySchema = z.object({
  tenantId: z.string().min(1),
});

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
  async monthlyPack(
    @Query() query: unknown,
    @Context() ctx: UseCaseContext
  ): Promise<GetMonthlyPackOutput> {
    const input = GetMonthlyPackInputSchema.parse(query);
    const result = await this.getMonthlyPack.execute(input, ctx);

    if (!result.ok) {
      throw result.error;
    }

    return result.value;
  }
}
