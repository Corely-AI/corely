import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  AnswerIncomeTaxDraftInterviewInputSchema,
  AttachTaxFilingDocumentRequestSchema,
  AttachTaxFilingPaymentProofRequestSchema,
  ConfirmIncomeTaxDraftSubmissionInputSchema,
  CreateTaxFilingInputSchema,
  CreateIncomeTaxDraftInputSchema,
  ExportTaxPaymentsInputSchema,
  GetTaxCenterInputSchema,
  PollIncomeTaxDraftPdfExportInputSchema,
  GetVatPeriodsInputSchema,
  ListTaxFilingsInputSchema,
  ListTaxPaymentsInputSchema,
  SubmitTaxFilingRequestSchema,
  TaxFilingItemsListQuerySchema,
  MarkTaxFilingPaidRequestSchema,
} from "@corely/contracts";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { AuthGuard } from "../identity/adapters/http/auth.guard";
import { buildTaxUseCaseContext, unwrap, unwrapWithProblemCode } from "./tax-http.utils";
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
import { ExportTaxFilingElsterXmlUseCase } from "./application/use-cases/export-tax-filing-elster-xml.use-case";
import { ExportTaxFilingKennzifferCsvUseCase } from "./application/use-cases/export-tax-filing-kennziffer-csv.use-case";
import { CreateIncomeTaxDraftUseCase } from "./application/use-cases/create-income-tax-draft.use-case";
import { GetIncomeTaxDraftUseCase } from "./application/use-cases/get-income-tax-draft.use-case";
import { GenerateIncomeTaxDraftEurUseCase } from "./application/use-cases/generate-income-tax-draft-eur.use-case";
import { RecomputeIncomeTaxDraftUseCase } from "./application/use-cases/recompute-income-tax-draft.use-case";
import { GetIncomeTaxDraftChecklistUseCase } from "./application/use-cases/get-income-tax-draft-checklist.use-case";
import { AnswerIncomeTaxDraftInterviewUseCase } from "./application/use-cases/answer-income-tax-draft-interview.use-case";
import { StartIncomeTaxDraftPdfExportUseCase } from "./application/use-cases/start-income-tax-draft-pdf-export.use-case";
import { PollIncomeTaxDraftPdfExportUseCase } from "./application/use-cases/poll-income-tax-draft-pdf-export.use-case";
import { ConfirmIncomeTaxDraftSubmissionUseCase } from "./application/use-cases/confirm-income-tax-draft-submission.use-case";

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
    private readonly deleteTaxFilingUseCase: DeleteTaxFilingUseCase,
    private readonly exportTaxFilingElsterXmlUseCase: ExportTaxFilingElsterXmlUseCase,
    private readonly exportTaxFilingKennzifferCsvUseCase: ExportTaxFilingKennzifferCsvUseCase,
    private readonly createIncomeTaxDraftUseCase: CreateIncomeTaxDraftUseCase,
    private readonly getIncomeTaxDraftUseCase: GetIncomeTaxDraftUseCase,
    private readonly generateIncomeTaxDraftEurUseCase: GenerateIncomeTaxDraftEurUseCase,
    private readonly recomputeIncomeTaxDraftUseCase: RecomputeIncomeTaxDraftUseCase,
    private readonly getIncomeTaxDraftChecklistUseCase: GetIncomeTaxDraftChecklistUseCase,
    private readonly answerIncomeTaxDraftInterviewUseCase: AnswerIncomeTaxDraftInterviewUseCase,
    private readonly startIncomeTaxDraftPdfExportUseCase: StartIncomeTaxDraftPdfExportUseCase,
    private readonly pollIncomeTaxDraftPdfExportUseCase: PollIncomeTaxDraftPdfExportUseCase,
    private readonly confirmIncomeTaxDraftSubmissionUseCase: ConfirmIncomeTaxDraftSubmissionUseCase
  ) {}

  @Get("center")
  async getCenter(@Query() query: any, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const input = GetTaxCenterInputSchema.parse({
      year: query.year,
      annualYear: query.annualYear,
      entityId: query.entityId,
    });
    return unwrap(await this.getTaxCenterUseCase.execute(input, ctx));
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

  @Get("filings/:id/exports/elster-xml")
  async exportFilingElsterXml(
    @Param("id") id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const exported = unwrapWithProblemCode(
      await this.exportTaxFilingElsterXmlUseCase.execute(id, ctx)
    );

    res.setHeader("Content-Type", `${exported.mimeType}; charset=${exported.encoding ?? "utf-8"}`);
    res.setHeader("Content-Disposition", this.toAttachmentDisposition(exported.fileName));
    return exported.content;
  }

  @Get("filings/:id/exports/kennziffer-csv")
  async exportFilingKennzifferCsv(
    @Param("id") id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const exported = unwrapWithProblemCode(
      await this.exportTaxFilingKennzifferCsvUseCase.execute(id, ctx)
    );

    res.setHeader("Content-Type", `${exported.mimeType}; charset=${exported.encoding ?? "utf-8"}`);
    res.setHeader("Content-Disposition", this.toAttachmentDisposition(exported.fileName));
    return exported.content;
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
      vatTreatment: query.vatTreatment,
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
  @HttpCode(200)
  async recalculateFiling(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrap(await this.recalculateTaxFilingUseCase.execute(id, ctx));
  }

  @Post("filings/:id/submit")
  @HttpCode(200)
  async submitFiling(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const request = SubmitTaxFilingRequestSchema.parse(body);
    return unwrap(await this.submitTaxFilingUseCase.execute({ filingId: id, request }, ctx));
  }

  @Post("filings/:id/mark-paid")
  @HttpCode(200)
  async markFilingPaid(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const request = MarkTaxFilingPaidRequestSchema.parse(body);
    return unwrap(await this.markTaxFilingPaidUseCase.execute({ filingId: id, request }, ctx));
  }

  @Post("filings/:id/payment-proof")
  @HttpCode(200)
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

  @Post("income-tax/drafts")
  async createIncomeTaxDraft(@Body() body: unknown, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    const input = CreateIncomeTaxDraftInputSchema.parse(body);
    return unwrapWithProblemCode(await this.createIncomeTaxDraftUseCase.execute(input, ctx));
  }

  @Get("income-tax/drafts/:id")
  async getIncomeTaxDraft(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrapWithProblemCode(await this.getIncomeTaxDraftUseCase.execute(id, ctx));
  }

  @Post("income-tax/drafts/:id/eur/generate")
  @HttpCode(200)
  async generateIncomeTaxDraftEur(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrapWithProblemCode(await this.generateIncomeTaxDraftEurUseCase.execute(id, ctx));
  }

  @Post("income-tax/drafts/:id/recompute")
  @HttpCode(200)
  async recomputeIncomeTaxDraft(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrapWithProblemCode(await this.recomputeIncomeTaxDraftUseCase.execute(id, ctx));
  }

  @Get("income-tax/drafts/:id/checklist")
  async getIncomeTaxDraftChecklist(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrapWithProblemCode(await this.getIncomeTaxDraftChecklistUseCase.execute(id, ctx));
  }

  @Post("income-tax/drafts/:id/interview/answer")
  @HttpCode(200)
  async answerIncomeTaxDraftInterview(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const request = AnswerIncomeTaxDraftInterviewInputSchema.parse(body);
    return unwrapWithProblemCode(
      await this.answerIncomeTaxDraftInterviewUseCase.execute({ draftId: id, request }, ctx)
    );
  }

  @Post("income-tax/drafts/:id/export/pdf")
  @HttpCode(200)
  async startIncomeTaxDraftPdfExport(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildTaxUseCaseContext(req);
    return unwrapWithProblemCode(await this.startIncomeTaxDraftPdfExportUseCase.execute(id, ctx));
  }

  @Get("income-tax/drafts/:id/export/pdf/:exportId")
  async pollIncomeTaxDraftPdfExport(
    @Param("id") id: string,
    @Param("exportId") exportId: string,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const parsed = PollIncomeTaxDraftPdfExportInputSchema.parse({ exportId });
    return unwrapWithProblemCode(
      await this.pollIncomeTaxDraftPdfExportUseCase.execute(
        { draftId: id, exportId: parsed.exportId },
        ctx
      )
    );
  }

  @Post("income-tax/drafts/:id/submission/confirm")
  @HttpCode(200)
  async confirmIncomeTaxDraftSubmission(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const ctx = buildTaxUseCaseContext(req);
    const request = ConfirmIncomeTaxDraftSubmissionInputSchema.parse(body);
    return unwrapWithProblemCode(
      await this.confirmIncomeTaxDraftSubmissionUseCase.execute({ draftId: id, request }, ctx)
    );
  }

  private toAttachmentDisposition(fileName: string): string {
    const safeFileName = fileName.replace(/"/g, "");
    return `attachment; filename="${safeFileName}"`;
  }
}
