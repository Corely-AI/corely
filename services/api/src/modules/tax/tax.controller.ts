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
    private readonly upsertTaxConsultantUseCase: UpsertTaxConsultantUseCase
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
    if (ctx.tenantId === "default-tenant") {
      throw new BadRequestException("Invalid tenantId in request context");
    }

    return {
      tenantId: ctx.tenantId!,
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
