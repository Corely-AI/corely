import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  UpsertTaxProfileInputSchema,
  CreateTaxCodeInputSchema,
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
  type CalculateTaxOutput,
  type LockTaxSnapshotOutput,
  type TaxProfileDto,
  type TaxCodeDto,
  type GetTaxSummaryOutput,
  type ListTaxReportsOutput,
  type UpsertTaxConsultantOutput,
  type GetTaxConsultantOutput,
  TaxFilingItemsListQuerySchema,
  SubmitTaxFilingRequestSchema,
  MarkTaxFilingPaidRequestSchema,
  AttachTaxFilingDocumentRequestSchema,
  AttachTaxFilingPaymentProofRequestSchema,
  ListTaxPaymentsInputSchema,
  ExportTaxPaymentsInputSchema,
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
import { GenerateTaxReportPdfUseCase } from "./application/use-cases/generate-tax-report-pdf.use-case";
import { GetTaxReportUseCase } from "./application/use-cases/get-tax-report.use-case";
import { VatPeriodResolver } from "./domain/services/vat-period.resolver";
import { GetTaxCenterUseCase } from "./application/use-cases/get-tax-center.use-case";
import { GetTaxCapabilitiesUseCase } from "./application/use-cases/get-tax-capabilities.use-case";
import { ListTaxFilingsUseCase } from "./application/use-cases/list-tax-filings.use-case";
import { ListTaxPaymentsUseCase } from "./application/use-cases/list-tax-payments.use-case";
import { ExportTaxPaymentsUseCase } from "./application/use-cases/export-tax-payments.use-case";
import { GetVatFilingPeriodsUseCase } from "./application/use-cases/get-vat-filing-periods.use-case";
import { CreateTaxFilingUseCase } from "./application/use-cases/create-tax-filing.use-case";
import { GetTaxFilingDetailUseCase } from "./application/use-cases/get-tax-filing-detail.use-case";
import { ListTaxFilingItemsUseCase } from "./application/use-cases/list-tax-filing-items.use-case";
import { ListTaxFilingAttachmentsUseCase } from "./application/use-cases/list-tax-filing-attachments.use-case";
import { AttachTaxFilingDocumentUseCase } from "./application/use-cases/attach-tax-filing-document.use-case";
import { AttachTaxFilingPaymentProofUseCase } from "./application/use-cases/attach-tax-filing-payment-proof.use-case";
import { RemoveTaxFilingAttachmentUseCase } from "./application/use-cases/remove-tax-filing-attachment.use-case";
import { ListTaxFilingActivityUseCase } from "./application/use-cases/list-tax-filing-activity.use-case";
import { RecalculateTaxFilingUseCase } from "./application/use-cases/recalculate-tax-filing.use-case";
import { SubmitTaxFilingUseCase } from "./application/use-cases/submit-tax-filing.use-case";
import { MarkTaxFilingPaidUseCase } from "./application/use-cases/mark-tax-filing-paid.use-case";
import { DeleteTaxFilingUseCase } from "./application/use-cases/delete-tax-filing.use-case";
import { Result } from "@corely/kernel";
import {
  CreateTaxFilingInputSchema,
  GetVatPeriodsInputSchema,
  ListTaxFilingsInputSchema,
} from "@corely/contracts";

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
    private readonly getTaxReportUseCase: GetTaxReportUseCase,
    private readonly markTaxReportSubmittedUseCase: MarkTaxReportSubmittedUseCase,
    private readonly getTaxConsultantUseCase: GetTaxConsultantUseCase,
    private readonly upsertTaxConsultantUseCase: UpsertTaxConsultantUseCase,
    private readonly listVatPeriodsUseCase: ListVatPeriodsUseCase,
    private readonly getVatPeriodSummaryUseCase: GetVatPeriodSummaryUseCase,
    private readonly getVatPeriodDetailsUseCase: GetVatPeriodDetailsUseCase,
    private readonly markVatPeriodSubmittedUseCase: MarkVatPeriodSubmittedUseCase,
    private readonly markVatPeriodNilUseCase: MarkVatPeriodNilUseCase,
    private readonly archiveVatPeriodUseCase: ArchiveVatPeriodUseCase,
    private readonly generateTaxReportPdfUseCase: GenerateTaxReportPdfUseCase,
    private readonly vatPeriodResolver: VatPeriodResolver,
    private readonly getTaxCenterUseCase: GetTaxCenterUseCase,
    private readonly getTaxCapabilitiesUseCase: GetTaxCapabilitiesUseCase,
    private readonly listTaxFilingsUseCase: ListTaxFilingsUseCase,
    private readonly listTaxPaymentsUseCase: ListTaxPaymentsUseCase,
    private readonly exportTaxPaymentsUseCase: ExportTaxPaymentsUseCase,
    private readonly getVatFilingPeriodsUseCase: GetVatFilingPeriodsUseCase,
    private readonly createTaxFilingUseCase: CreateTaxFilingUseCase,
    private readonly getTaxFilingDetailUseCase: GetTaxFilingDetailUseCase,
    private readonly listTaxFilingItemsUseCase: ListTaxFilingItemsUseCase,
    private readonly listTaxFilingAttachmentsUseCase: ListTaxFilingAttachmentsUseCase,
    private readonly attachTaxFilingDocumentUseCase: AttachTaxFilingDocumentUseCase,
    private readonly attachTaxFilingPaymentProofUseCase: AttachTaxFilingPaymentProofUseCase,
    private readonly removeTaxFilingAttachmentUseCase: RemoveTaxFilingAttachmentUseCase,
    private readonly listTaxFilingActivityUseCase: ListTaxFilingActivityUseCase,
    private readonly recalculateTaxFilingUseCase: RecalculateTaxFilingUseCase,
    private readonly submitTaxFilingUseCase: SubmitTaxFilingUseCase,
    private readonly markTaxFilingPaidUseCase: MarkTaxFilingPaidUseCase,
    private readonly deleteTaxFilingUseCase: DeleteTaxFilingUseCase
  ) {}

  // ============================================================================
  // Tax Profile
  // ============================================================================

  @Get("profile")
  async getProfile(@Req() req: Request): Promise<GetTaxProfileOutput> {
    const ctx = this.buildContext(req);
    const profile = this.unwrap(await this.getTaxProfileUseCase.execute(undefined, ctx));

    return {
      profile: profile ? this.profileToDto(profile) : null,
    };
  }

  @Put("profile")
  async upsertProfile(@Body() body: unknown, @Req() req: Request): Promise<UpsertTaxProfileOutput> {
    const input = UpsertTaxProfileInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const profile = this.unwrap(await this.upsertTaxProfileUseCase.execute(input, ctx));

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
    const codes = this.unwrap(await this.listTaxCodesUseCase.execute(undefined, ctx));

    return {
      codes: codes.map((c) => this.codeToDto(c)),
    };
  }

  @Post("codes")
  async createCode(@Body() body: unknown, @Req() req: Request): Promise<CreateTaxCodeOutput> {
    const input = CreateTaxCodeInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const code = this.unwrap(await this.createTaxCodeUseCase.execute(input, ctx));

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

    const breakdown = this.unwrap(await this.calculateTaxUseCase.execute(input, ctx));

    return { breakdown };
  }

  // ============================================================================
  // Tax Snapshot
  // ============================================================================

  @Post("snapshots/lock")
  async lockSnapshot(@Body() body: unknown, @Req() req: Request): Promise<LockTaxSnapshotOutput> {
    const input = LockTaxSnapshotInputSchema.parse(body);
    const ctx = this.buildContext(req);

    const snapshot = this.unwrap(await this.lockTaxSnapshotUseCase.execute(input, ctx));

    return { snapshot };
  }

  // ============================================================================
  // Summary & Reports
  // ============================================================================

  @Get("summary")
  async getSummary(@Req() req: Request): Promise<GetTaxSummaryOutput> {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.getTaxSummaryUseCase.execute(undefined, ctx));
  }

  @Get("reports")
  async listReports(@Query() query: any, @Req() req: Request): Promise<ListTaxReportsOutput> {
    const parsed = ListTaxReportsInputSchema.parse({
      status: query.status,
      group: query.group,
      type: query.type,
    });
    const ctx = this.buildContext(req);
    return this.unwrap(
      await this.listTaxReportsUseCase.execute(
        {
          status: (parsed.status as any) ?? "upcoming",
          group: parsed.group,
          type: parsed.type,
        },
        ctx
      )
    );
  }

  @Get("reports/:id")
  async getReport(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const report = this.unwrap(await this.getTaxReportUseCase.execute(id, ctx));
    return { report };
  }

  @Post("reports/:id/mark-submitted")
  async markSubmitted(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.markTaxReportSubmittedUseCase.execute(id, ctx));
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
    return this.unwrap(await this.listVatPeriodsUseCase.execute(input, ctx));
  }

  @Get("periods/:key")
  async getVatPeriodSummary(@Param("key") key: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const period = this.vatPeriodResolver.resolveQuarter(key);

    return this.unwrap(
      await this.getVatPeriodSummaryUseCase.execute(
        {
          periodStart: period.start.toISOString(),
          periodEnd: period.end.toISOString(),
        },
        ctx
      )
    );
  }

  @Get("periods/:key/details")
  async getVatPeriodDetails(@Param("key") key: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.getVatPeriodDetailsUseCase.execute(key, ctx));
  }

  @Post("reports/vat/quarterly/:key/mark-submitted")
  async markVatPeriodSubmitted(
    @Param("key") key: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = MarkVatPeriodSubmittedInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.unwrap(
      await this.markVatPeriodSubmittedUseCase.execute({ ...input, periodKey: key }, ctx)
    );
  }

  @Post("reports/vat/quarterly/:key/mark-nil")
  async markVatPeriodNil(@Param("key") key: string, @Body() body: unknown, @Req() req: Request) {
    const input = MarkVatPeriodNilInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.unwrap(
      await this.markVatPeriodNilUseCase.execute({ ...input, periodKey: key }, ctx)
    );
  }

  @Post("reports/vat/quarterly/:key/archive")
  async archiveVatPeriod(@Param("key") key: string, @Body() body: unknown, @Req() req: Request) {
    const input = ArchiveVatPeriodInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.unwrap(
      await this.archiveVatPeriodUseCase.execute({ ...input, periodKey: key }, ctx)
    );
  }

  @Get("reports/vat/quarterly/:key/pdf-url")
  async getVatPeriodPdfUrl(@Param("key") key: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.generateTaxReportPdfUseCase.execute({ periodKey: key }, ctx));
  }

  @Get("reports/:id/pdf-url")
  async getReportPdfUrl(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.generateTaxReportPdfUseCase.execute({ reportId: id }, ctx));
  }

  // ============================================================================
  // Tax Center & Filings (New)
  // ============================================================================

  @Get("center")
  async getCenter(@Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(
      await this.getTaxCenterUseCase.execute(
        { year: query.year ? Number(query.year) : undefined, entityId: query.entityId },
        ctx
      )
    );
  }

  @Get("capabilities")
  async getCapabilities(@Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.getTaxCapabilitiesUseCase.execute(undefined, ctx));
  }

  @Get("filings")
  async listFilings(@Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const input = ListTaxFilingsInputSchema.parse({
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      filters: query.filters,
      type: query.type,
      status: query.status,
      year: query.year,
      periodKey: query.periodKey,
      dueFrom: query.dueFrom,
      dueTo: query.dueTo,
      needsAttention: query.needsAttention,
      hasIssues: query.hasIssues,
      entityId: query.entityId,
    });
    return this.unwrap(await this.listTaxFilingsUseCase.execute(input, ctx));
  }

  @Get("payments")
  async listPayments(@Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const input = ListTaxPaymentsInputSchema.parse({
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      filters: query.filters,
      status: query.status,
      year: query.year,
      type: query.type,
      dueFrom: query.dueFrom,
      dueTo: query.dueTo,
      paidFrom: query.paidFrom,
      paidTo: query.paidTo,
    });
    return this.unwrap(await this.listTaxPaymentsUseCase.execute(input, ctx));
  }

  @Get("payments/export")
  async exportPayments(@Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const input = ExportTaxPaymentsInputSchema.parse({
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      filters: query.filters,
      status: query.status,
      year: query.year,
      type: query.type,
      dueFrom: query.dueFrom,
      dueTo: query.dueTo,
      paidFrom: query.paidFrom,
      paidTo: query.paidTo,
    });
    return this.unwrap(await this.exportTaxPaymentsUseCase.execute(input, ctx));
  }

  @Get("filings/:id")
  async getFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.getTaxFilingDetailUseCase.execute(id, ctx));
  }

  @Get("filings/:id/items")
  async listFilingItems(@Param("id") id: string, @Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const parsed = TaxFilingItemsListQuerySchema.parse({
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      filters: query.filters,
      sourceType: query.sourceType,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      category: query.category,
      needsAttention: query.needsAttention,
      missingMapping: query.missingMapping,
    });
    return this.unwrap(
      await this.listTaxFilingItemsUseCase.execute({ filingId: id, query: parsed }, ctx)
    );
  }

  @Get("filings/:id/attachments")
  async listFilingAttachments(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.listTaxFilingAttachmentsUseCase.execute(id, ctx));
  }

  @Post("filings/:id/attachments")
  async attachFilingDocument(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const request = AttachTaxFilingDocumentRequestSchema.parse(body);
    return this.unwrap(
      await this.attachTaxFilingDocumentUseCase.execute({ filingId: id, request }, ctx)
    );
  }

  @Delete("filings/:id/attachments/:attachmentId")
  async removeFilingAttachment(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Req() req: Request
  ) {
    const ctx = this.buildContext(req);
    return this.unwrap(
      await this.removeTaxFilingAttachmentUseCase.execute(
        { filingId: id, documentId: attachmentId },
        ctx
      )
    );
  }

  @Get("filings/:id/activity")
  async getFilingActivity(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.listTaxFilingActivityUseCase.execute(id, ctx));
  }

  @Post("filings/:id/recalculate")
  async recalculateFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.recalculateTaxFilingUseCase.execute(id, ctx));
  }

  @Post("filings/:id/submit")
  async submitFiling(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const request = SubmitTaxFilingRequestSchema.parse(body);
    return this.unwrap(await this.submitTaxFilingUseCase.execute({ filingId: id, request }, ctx));
  }

  @Post("filings/:id/mark-paid")
  async markFilingPaid(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const request = MarkTaxFilingPaidRequestSchema.parse(body);
    return this.unwrap(await this.markTaxFilingPaidUseCase.execute({ filingId: id, request }, ctx));
  }

  @Post("filings/:id/payment-proof")
  async attachPaymentProof(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const request = AttachTaxFilingPaymentProofRequestSchema.parse(body);
    return this.unwrap(
      await this.attachTaxFilingPaymentProofUseCase.execute({ filingId: id, request }, ctx)
    );
  }

  @Delete("filings/:id")
  async deleteFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.deleteTaxFilingUseCase.execute(id, ctx));
  }

  @Post("filings")
  async createFiling(@Body() body: unknown, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const input = CreateTaxFilingInputSchema.parse(body);
    return this.unwrap(await this.createTaxFilingUseCase.execute(input, ctx));
  }

  @Get("vat/periods")
  async getVatFilingsPeriods(@Query() query: any, @Req() req: Request) {
    const ctx = this.buildContext(req);
    const input = GetVatPeriodsInputSchema.parse({
      year: query.year,
      entityId: query.entityId,
    });
    return this.unwrap(await this.getVatFilingPeriodsUseCase.execute(input, ctx));
  }

  // ============================================================================
  // Consultant
  // ============================================================================

  @Get("consultant")
  async getConsultant(@Req() req: Request): Promise<GetTaxConsultantOutput> {
    const ctx = this.buildContext(req);
    return this.unwrap(await this.getTaxConsultantUseCase.execute(undefined, ctx));
  }

  @Put("consultant")
  async upsertConsultant(
    @Body() body: unknown,
    @Req() req: Request
  ): Promise<UpsertTaxConsultantOutput> {
    const input = UpsertTaxConsultantInputSchema.parse(body);
    const ctx = this.buildContext(req);
    return this.unwrap(await this.upsertTaxConsultantUseCase.execute(input, ctx));
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private unwrap<T>(result: Result<T, any>): T {
    if ("error" in result) {
      throw result.error;
    }
    return result.value;
  }

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
      vatAccountingMethod: entity.vatAccountingMethod,
      taxYearStartMonth: entity.taxYearStartMonth,
      localTaxOfficeName: entity.localTaxOfficeName,
      vatExemptionParagraph: entity.vatExemptionParagraph ?? null,
      euB2BSales: entity.euB2BSales ?? false,
      hasEmployees: entity.hasEmployees ?? false,
      usesTaxAdvisor: entity.usesTaxAdvisor ?? false,
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
