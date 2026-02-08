import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { ReportingController } from "./adapters/http/reporting.controller";
import { REPORTING_QUERY_PORT } from "./application/ports/reporting-query.port";
import { GetDashboardReportUseCase } from "./application/use-cases/get-dashboard-report.usecase";
import { GetMonthlyPackUseCase } from "./application/use-cases/get-monthly-pack.usecase";
import { PrismaReportingQueryAdapter } from "./infrastructure/prisma/prisma-reporting-query.adapter";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";

@Module({
  imports: [DataModule, KernelModule, IdentityModule],
  controllers: [ReportingController],
  providers: [
    NestLoggerAdapter,
    PrismaReportingQueryAdapter,
    { provide: REPORTING_QUERY_PORT, useExisting: PrismaReportingQueryAdapter },
    {
      provide: GetDashboardReportUseCase,
      useFactory: (query) => new GetDashboardReportUseCase(query),
      inject: [REPORTING_QUERY_PORT],
    },
    {
      provide: GetMonthlyPackUseCase,
      useFactory: (logger, reportingQuery) => new GetMonthlyPackUseCase({ logger, reportingQuery }),
      inject: [NestLoggerAdapter, REPORTING_QUERY_PORT],
    },
  ],
})
export class ReportingModule {}
