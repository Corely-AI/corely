import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import {
  AttachTaxFilingDocumentRequestSchema,
  AttachTaxFilingPaymentProofRequestSchema,
  CreateTaxFilingInputSchema,
  ExportTaxPaymentsInputSchema,
  GetVatPeriodsInputSchema,
  ListTaxFilingsInputSchema,
  ListTaxPaymentsInputSchema,
  SubmitTaxFilingRequestSchema,
  TaxFilingItemsListQuerySchema,
  MarkTaxFilingPaidRequestSchema,
} from "@corely/contracts";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { AuthGuard } from "../identity/adapters/http/auth.guard";
import { buildTaxUseCaseContext, unwrap } from "./tax-http.utils";
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

@Controller("tax")
@UseGuards(AuthGuard)
@UseInterceptors(IdempotencyInterceptor)
export class TaxFilingsController {
  constructor(
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

  @Get("center")
  async getCenter(@Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.getTaxCenterUseCase.execute(
        { year: query.year ? Number(query.year) : undefined, entityId: query.entityId },
        ctx
      )
    );
  }

  @Get("capabilities")
  async getCapabilities(@Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.getTaxCapabilitiesUseCase.execute(undefined, ctx));
  }

  @Get("filings")
  async listFilings(@Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
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
    return unwrap(await this.listTaxFilingsUseCase.execute(input, ctx));
  }

  @Get("payments")
  async listPayments(@Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
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
    return unwrap(await this.listTaxPaymentsUseCase.execute(input, ctx));
  }

  @Get("payments/export")
  async exportPayments(@Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
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
    return unwrap(await this.exportTaxPaymentsUseCase.execute(input, ctx));
  }

  @Get("filings/:id")
  async getFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.getTaxFilingDetailUseCase.execute(id, ctx));
  }

  @Get("filings/:id/items")
  async listFilingItems(@Param("id") id: string, @Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
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
    return unwrap(
      await this.listTaxFilingItemsUseCase.execute({ filingId: id, query: parsed }, ctx)
    );
  }

  @Get("filings/:id/attachments")
  async listFilingAttachments(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.listTaxFilingAttachmentsUseCase.execute(id, ctx));
  }

  @Post("filings/:id/attachments")
  async attachFilingDocument(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const request = AttachTaxFilingDocumentRequestSchema.parse(body);
    return unwrap(
      await this.attachTaxFilingDocumentUseCase.execute({ filingId: id, request }, ctx)
    );
  }

  @Delete("filings/:id/attachments/:attachmentId")
  async removeFilingAttachment(
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(
      await this.removeTaxFilingAttachmentUseCase.execute(
        { filingId: id, documentId: attachmentId },
        ctx
      )
    );
  }

  @Get("filings/:id/activity")
  async getFilingActivity(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.listTaxFilingActivityUseCase.execute(id, ctx));
  }

  @Post("filings/:id/recalculate")
  async recalculateFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.recalculateTaxFilingUseCase.execute(id, ctx));
  }

  @Post("filings/:id/submit")
  async submitFiling(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const request = SubmitTaxFilingRequestSchema.parse(body);
    return unwrap(await this.submitTaxFilingUseCase.execute({ filingId: id, request }, ctx));
  }

  @Post("filings/:id/mark-paid")
  async markFilingPaid(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const request = MarkTaxFilingPaidRequestSchema.parse(body);
    return unwrap(await this.markTaxFilingPaidUseCase.execute({ filingId: id, request }, ctx));
  }

  @Post("filings/:id/payment-proof")
  async attachPaymentProof(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const request = AttachTaxFilingPaymentProofRequestSchema.parse(body);
    return unwrap(
      await this.attachTaxFilingPaymentProofUseCase.execute({ filingId: id, request }, ctx)
    );
  }

  @Delete("filings/:id")
  async deleteFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.deleteTaxFilingUseCase.execute(id, ctx));
  }

  @Post("filings")
  async createFiling(@Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const input = CreateTaxFilingInputSchema.parse(body);
    return unwrap(await this.createTaxFilingUseCase.execute(input, ctx));
  }

  @Get("vat/periods")
  async getVatFilingsPeriods(@Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const input = GetVatPeriodsInputSchema.parse({
      year: query.year,
      entityId: query.entityId,
    });
    return unwrap(await this.getVatFilingPeriodsUseCase.execute(input, ctx));
  }
}
