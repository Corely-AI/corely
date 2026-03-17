import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import {
  TaxReportSectionKeySchema,
  UpsertAnnualIncomeSectionInputSchema,
  UpsertTaxReportSectionInputSchema,
} from "@corely/contracts";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { AuthGuard } from "../identity/adapters/http/auth.guard";
import { buildTaxUseCaseContext, unwrap } from "./tax-http.utils";
import { GetAnnualIncomeReportSectionUseCase } from "./application/use-cases/get-annual-income-report-section.use-case";
import { UpsertAnnualIncomeReportSectionUseCase } from "./application/use-cases/upsert-annual-income-report-section.use-case";
import { RequestTaxEricJobUseCase } from "./application/use-cases/request-tax-eric-job.use-case";
import { GetTaxEricJobUseCase } from "./application/use-cases/get-tax-eric-job.use-case";
import { GetTaxReportSectionUseCase } from "./application/use-cases/get-tax-report-section.use-case";
import { ListTaxReportSectionsUseCase } from "./application/use-cases/list-tax-report-sections.use-case";
import { UpsertTaxReportSectionUseCase } from "./application/use-cases/upsert-tax-report-section.use-case";

@Controller("tax")
@UseGuards(AuthGuard)
@UseInterceptors(IdempotencyInterceptor)
export class TaxFilingReportsController {
  constructor(
    private readonly getAnnualIncomeReportSectionUseCase: GetAnnualIncomeReportSectionUseCase,
    private readonly upsertAnnualIncomeReportSectionUseCase: UpsertAnnualIncomeReportSectionUseCase,
    private readonly listTaxReportSectionsUseCase: ListTaxReportSectionsUseCase,
    private readonly getTaxReportSectionUseCase: GetTaxReportSectionUseCase,
    private readonly upsertTaxReportSectionUseCase: UpsertTaxReportSectionUseCase,
    private readonly requestTaxEricJobUseCase: RequestTaxEricJobUseCase,
    private readonly getTaxEricJobUseCase: GetTaxEricJobUseCase
  ) {}

  @Get("filings/:filingId/reports/:reportId/sections/annual-income")
  async getAnnualIncomeSection(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.getAnnualIncomeReportSectionUseCase.execute(
        {
          filingId,
          reportId,
        },
        ctx
      )
    );
  }

  @Get("filings/:filingId/reports/:reportId/sections")
  async listSections(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.listTaxReportSectionsUseCase.execute(
        {
          filingId,
          reportId,
        },
        ctx
      )
    );
  }

  @Get("filings/:filingId/reports/:reportId/sections/:sectionKey")
  async getSection(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Param("sectionKey") sectionKey: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const parsedSectionKey = TaxReportSectionKeySchema.parse(sectionKey);
    return unwrap(
      await this.getTaxReportSectionUseCase.execute(
        {
          filingId,
          reportId,
          sectionKey: parsedSectionKey,
        },
        ctx
      )
    );
  }

  @Put("filings/:filingId/reports/:reportId/sections/annual-income")
  async upsertAnnualIncomeSection(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const parsed = UpsertAnnualIncomeSectionInputSchema.parse(body);
    return unwrap(
      await this.upsertAnnualIncomeReportSectionUseCase.execute(
        {
          filingId,
          reportId,
          payload: parsed.payload,
        },
        ctx
      )
    );
  }

  @Put("filings/:filingId/reports/:reportId/sections/:sectionKey")
  async upsertSection(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Param("sectionKey") sectionKey: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const parsedSectionKey = TaxReportSectionKeySchema.parse(sectionKey);
    const parsed = UpsertTaxReportSectionInputSchema.parse(body);
    return unwrap(
      await this.upsertTaxReportSectionUseCase.execute(
        {
          filingId,
          reportId,
          sectionKey: parsedSectionKey,
          payload: parsed.payload,
        },
        ctx
      )
    );
  }

  @Post("filings/:filingId/reports/:reportId/eric/validate")
  @HttpCode(202)
  async validateEricReport(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.requestTaxEricJobUseCase.execute(
        {
          filingId,
          reportId,
          action: "validate",
        },
        ctx
      )
    );
  }

  @Post("filings/:filingId/reports/:reportId/eric/submit")
  @HttpCode(202)
  async submitEricReport(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.requestTaxEricJobUseCase.execute(
        {
          filingId,
          reportId,
          action: "submit",
        },
        ctx
      )
    );
  }

  @Get("filings/:filingId/reports/:reportId/eric/jobs/:jobId")
  async getEricJob(
    @Param("filingId") filingId: string,
    @Param("reportId") reportId: string,
    @Param("jobId") jobId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.getTaxEricJobUseCase.execute(
        {
          filingId,
          reportId,
          jobId,
        },
        ctx
      )
    );
  }
}
