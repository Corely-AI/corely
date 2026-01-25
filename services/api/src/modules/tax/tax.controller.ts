import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  GetTaxProfileOutputSchema,
  UpsertTaxProfileInputSchema,
  ListTaxCodesOutputSchema,
  CreateTaxCodeInputSchema,
  UpdateTaxCodeInputSchema,
  CreateTaxRateInputSchema,
  CalculateTaxInputSchema,
  LockTaxSnapshotInputSchema,
  ListTaxReportsInputSchema,
  UpsertTaxConsultantInputSchema,
  ListVatPeriodsInputSchema,
  MarkVatPeriodSubmittedInputSchema,
  MarkVatPeriodNilInputSchema,
  ArchiveVatPeriodInputSchema,
  type GetTaxProfileOutput,
  type UpsertTaxProfileOutput,
  type ListTaxCodesOutput,
  type CreateTaxCodeOutput,
  type UpdateTaxCodeOutput,
  type CreateTaxRateOutput,
  type CalculateTaxOutput,
  type LockTaxSnapshotOutput,
  type ListTaxRatesOutput,
  type TaxProfileDto,
  type TaxCodeDto,
  type TaxRateDto,
  type GetTaxSummaryOutput,
  type ListTaxReportsOutput,
  type UpsertTaxConsultantOutput,
  type GetTaxConsultantOutput,
} from "@corely/contracts";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { AuthGuard } from "../identity/adapters/http/auth.guard";
import { GetTaxProfileUseCase } from "./application/use-cases/get-tax-profile.use-case";
import { UpsertTaxProfileUseCase } from "./application/use-cases/upsert-tax-profile.use-case";
import { ListTaxCodesUseCase } from "./application/use-cases/list-tax-codes.use-case";
import { CreateTaxCodeUseCase } from "./application/use-cases/create-tax-code.use-case";
import { CalculateTaxUseCase } from "./application/use-cases/calculate-tax.use-case";
import { LockTaxSnapshotUseCase } from "./application/use-cases/lock-tax-snapshot.use-case";
import type { UseCaseContext } from "./application/use-cases/use-case-context";
import { toUseCaseContext } from "../../shared/request-context";
import { GetTaxSummaryUseCase } from "./application/use-cases/get-tax-summary.use-case";
import { ListTaxReportsUseCase } from "./application/use-cases/list-tax-reports.use-case";
import { MarkTaxReportSubmittedUseCase } from "./application/use-cases/mark-tax-report-submitted.use-case";
import { GetTaxConsultantUseCase } from "./application/use-cases/get-tax-consultant.use-case";
import { UpsertTaxConsultantUseCase } from "./application/use-cases/upsert-tax-consultant.use-case";
import { ListVatPeriodsUseCase } from "./application/use-cases/list-vat-periods.use-case";
import { GetVatPeriodSummaryUseCase } from "./application/use-cases/get-vat-period-summary.use-case";
import { GetVatPeriodDetailsUseCase } from "./application/use-cases/get-vat-period-details.use-case";
import { MarkVatPeriodSubmittedUseCase } from "./application/use-cases/mark-vat-period-submitted.use-case";
import { MarkVatPeriodNilUseCase } from "./application/use-cases/mark-vat-period-nil.use-case";
import { ArchiveVatPeriodUseCase } from "./application/use-cases/archive-vat-period.use-case";
import { VatPeriodResolver } from "./domain/services/vat-period.resolver";

@Controller("tax")
@UseGuards(AuthGuard)
@UseInterceptors(IdempotencyInterceptor)
export class TaxController {
  constructor(
    private readonly getTaxProfileUseCase: GetTaxProfileUseCase,
    private readonly upsertTaxProfileUseCase: UpsertTaxProfileUseCase,
    private readonly listTaxCodesUseCase: ListTaxCodesUseCase,
    private readonly createTaxCodeUseCase: CreateTaxCodeUseCase,
    private readonly calculateTaxUseCase: CalculateTaxUseCase,
    private readonly lockTaxSnapshotUseCase: LockTaxSnapshotUseCase,
    private readonly getTaxSummaryUseCase: GetTaxSummaryUseCase,
    private readonly listTaxReportsUseCase: ListTaxReportsUseCase,
    private readonly markTaxReportSubmittedUseCase: MarkTaxReportSubmittedUseCase,
    private readonly getTaxConsultantUseCase: GetTaxConsultantUseCase,
    private readonly upsertTaxConsultantUseCase: UpsertTaxConsultantUseCase,
    private readonly listVatPeriodsUseCase: ListVatPeriodsUseCase,
    private readonly getVatPeriodSummaryUseCase: GetVatPeriodSummaryUseCase,
    private readonly getVatPeriodDetailsUseCase: GetVatPeriodDetailsUseCase,
    private readonly markVatPeriodSubmittedUseCase: MarkVatPeriodSubmittedUseCase,
    private readonly markVatPeriodNilUseCase: MarkVatPeriodNilUseCase,
    private readonly archiveVatPeriodUseCase: ArchiveVatPeriodUseCase,
    private readonly vatPeriodResolver: VatPeriodResolver
  ) {}

  // ============================================================================
  // Tax Profile
  // ============================================================================

  @Get("profile")
  async getProfile(@Req() req: Request): Promise<GetTaxProfileOutput> {
    const ctx = this.buildContext(req);
    const profile = await this.getTaxProfileUseCase.execute(ctx);

    return {
      profile: profile ? this.profileToDto(profile) : null,
    };
  }

  @Put("profile")
  async upsertProfile(@Body() body: unknown, @Req() req: Request): Promise<UpsertTaxProfileOutput> {
    const input = UpsertTaxProfileInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const profile = await this.upsertTaxProfileUseCase.execute(input, ctx);

    return {
      profile: this.profileToDto(profile),
    };
  }

  // ============================================================================
  // Tax Codes
  // ============================================================================

  @Get("codes")
  async listCodes(@Req() req: Request): Promise<ListTaxCodesOutput> {
    const ctx = this.buildContext(req);
    const codes = await this.listTaxCodesUseCase.execute(ctx);

    return {
      codes: codes.map((c) => this.codeToDto(c)),
    };
  }

  @Post("codes")
  async createCode(@Body() body: unknown, @Req() req: Request): Promise<CreateTaxCodeOutput> {
    const input = CreateTaxCodeInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const code = await this.createTaxCodeUseCase.execute(input, ctx);

    return {
      code: this.codeToDto(code),
    };
  }

  // ============================================================================
  // Tax Calculation
  // ============================================================================

  @Post("calculate")
  async calculate(@Body() body: unknown, @Req() req: Request): Promise<CalculateTaxOutput> {
    const input = CalculateTaxInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const breakdown = await this.calculateTaxUseCase.execute(input, ctx);

    return { breakdown };
  }

  // ============================================================================
  // Tax Snapshot
  // ============================================================================

  @Post("snapshots/lock")
  async lockSnapshot(@Body() body: unknown, @Req() req: Request): Promise<LockTaxSnapshotOutput> {
    const input = LockTaxSnapshotInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const snapshot = await this.lockTaxSnapshotUseCase.execute(input, ctx);

    return { snapshot };
  }

  // ============================================================================
  // Summary & Reports
  // ============================================================================

  @Get("summary")
  async getSummary(@Req() req: Request): Promise<GetTaxSummaryOutput> {
    const ctx = this.buildContext(req);
    return this.getTaxSummaryUseCase.execute(ctx);
  }

  @Get("reports")
  async listReports(@Query() query: any, @Req() req: Request): Promise<ListTaxReportsOutput> {
    const parsed = ListTaxReportsInputSchema.parse({
      status: query.status,
      group: query.group,
      type: query.type,
    });
    const ctx = this.buildContext(req);
    return this.listTaxReportsUseCase.execute(parsed.status ?? "upcoming", parsed, ctx);
  }

  @Post("reports/:id/mark-submitted")
  async markSubmitted(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.markTaxReportSubmittedUseCase.execute(id, ctx);
  }

  // ============================================================================
  // VAT Periods
  // ============================================================================

  @Get("periods")
  async listVatPeriods(@Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const input = ListVatPeriodsInputSchema.parse({
      from: query.from,
      to: query.to,
      year: query.year ? Number(query.year) : undefined,
      type: query.type,
    });
    return this.listVatPeriodsUseCase.execute(input, ctx);
  }

  @Get("periods/:key")
  async getVatPeriodSummary(@Param("key") key: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const period = this.vatPeriodResolver.resolveQuarter(key);

    // We convert key to start/end for the use case which follows the contract
    return this.getVatPeriodSummaryUseCase.execute(
      {
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      },
      ctx
    );
  }

  @Get("periods/:key/details")
  async getVatPeriodDetails(@Param("key") key: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    // Use case internally resolves key (as I implemented it to take periodKey)
    // Wait, let's verify GetVatPeriodDetailsUseCase implementation.
    // Yes, it takes (periodKey, ctx).
    return this.getVatPeriodDetailsUseCase.execute(key, ctx);
  }

  @Post("reports/vat/quarterly/:key/mark-submitted")
  async markVatPeriodSubmitted(
    @Param("key") key: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = MarkVatPeriodSubmittedInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.markVatPeriodSubmittedUseCase.execute(key, input, ctx);
  }

  @Post("reports/vat/quarterly/:key/mark-nil")
  async markVatPeriodNil(@Param("key") key: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkVatPeriodNilInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.markVatPeriodNilUseCase.execute(key, input, ctx);
  }

  @Post("reports/vat/quarterly/:key/archive")
  async archiveVatPeriod(@Param("key") key: string, @Body() body: unknown, @Req() req: Request) {
    const input = ArchiveVatPeriodInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.archiveVatPeriodUseCase.execute(key, input, ctx);
  }

  // ============================================================================
  // Consultant
  // ============================================================================

  @Get("consultant")
  async getConsultant(@Req() req: Request): Promise<GetTaxConsultantOutput> {
    const ctx = this.buildContext(req);
    return this.getTaxConsultantUseCase.execute(ctx);
  }

  @Put("consultant")
  async upsertConsultant(
    @Body() body: unknown,
    @Req() req: Request
  ): Promise<UpsertTaxConsultantOutput> {
    const input = UpsertTaxConsultantInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.upsertTaxConsultantUseCase.execute(input, ctx);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private buildContext(req: Request): UseCaseContext {
    const ctx = toUseCaseContext(req as any);

    if (!ctx.tenantId) {
      throw new BadRequestException("Missing tenantId in request context");
    }
    if (!ctx.userId) {
      throw new BadRequestException("Missing userId in request context");
    }
    if (!ctx.workspaceId) {
      throw new BadRequestException("Missing workspaceId in request context");
    }
    if (ctx.tenantId === "default-tenant") {
      throw new BadRequestException("Invalid tenantId in request context");
    }

    return {
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId!,
      userId: ctx.userId!,
      correlationId: ctx.correlationId,
      idempotencyKey: req.headers["x-idempotency-key"] as string | undefined,
    };
  }

  private profileToDto(entity: any): TaxProfileDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      country: entity.country,
      regime: entity.regime,
      vatEnabled: entity.vatEnabled,
      vatId: entity.vatId,
      currency: entity.currency,
      filingFrequency: entity.filingFrequency,
      taxYearStartMonth: entity.taxYearStartMonth,
      localTaxOfficeName: entity.localTaxOfficeName,
      vatExemptionParagraph: entity.vatExemptionParagraph ?? null,
      effectiveFrom: entity.effectiveFrom.toISOString(),
      effectiveTo: entity.effectiveTo?.toISOString() || null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private codeToDto(entity: any): TaxCodeDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      code: entity.code,
      kind: entity.kind,
      label: entity.label,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
