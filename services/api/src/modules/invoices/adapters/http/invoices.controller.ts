import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { InvoicesApplication } from "../../application/invoices.application";
import { PartyApplication } from "../../../party/application/party.application";
import {
  CancelInvoiceInputSchema,
  CreateInvoiceInputSchema,
  GenerateInvoiceShareLinkInputSchema,
  RequestInvoicePdfInputSchema,
  FinalizeInvoiceInputSchema,
  GetInvoiceByIdInputSchema,
  ListInvoicesInputSchema,
  RecordPaymentInputSchema,
  SendInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@corely/contracts";
import { EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import { parseListQuery } from "../../../../shared/http/pagination";
import { buildUseCaseContext, mapResultToHttp } from "./mappers";

import { AuthGuard } from "../../../identity";
import { ModuleRef } from "@nestjs/core";
import { DocumentsApplication } from "../../../documents/application/documents.application";
import {
  INVOICE_SHARE_LINK_MODULE_ID,
  INVOICE_SHARE_LINK_SCOPE,
  createInvoiceShareToken,
  invoiceShareLinkKey,
  parseInvoiceShareLinkRecord,
} from "./invoice-share-link.utils";

const SEND_INVOICE_PDF_WAIT_MS = 90_000;

@Controller("invoices")
@UseGuards(AuthGuard)
export class InvoicesHttpController {
  constructor(
    @Inject(InvoicesApplication) @Optional() private readonly app: InvoicesApplication | null,
    @Inject(PartyApplication) @Optional() private readonly partyApp: PartyApplication | null,
    @Inject(DocumentsApplication)
    @Optional()
    private readonly documentsApp: DocumentsApplication | null,
    @Inject(EXT_KV_PORT) @Optional() private readonly extKv: ExtKvPort | null,
    @Optional() private readonly moduleRef?: ModuleRef
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateInvoiceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const app = this.app ?? this.moduleRef?.get(InvoicesApplication, { strict: false });
    if (!app) {
      throw new Error("InvoicesApplication not available");
    }

    const result = await app.createInvoice.execute(input, ctx);
    const invoice = mapResultToHttp(result).invoice;
    return { ...invoice, invoice };
  }

  @Patch(":invoiceId")
  async update(@Param("invoiceId") invoiceId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateInvoice.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/finalize")
  async finalize(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = FinalizeInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.finalizeInvoice.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/send")
  async send(@Param("invoiceId") invoiceId: string, @Body() body: unknown, @Req() req: Request) {
    const input = SendInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);

    if (input.attachPdf) {
      const docsApp =
        this.documentsApp ?? this.moduleRef?.get(DocumentsApplication, { strict: false });
      if (!docsApp) {
        throw new Error("DocumentsApplication not available");
      }

      const pdfResult = mapResultToHttp(
        await docsApp.getInvoicePdf.execute(
          {
            invoiceId,
            waitMs: SEND_INVOICE_PDF_WAIT_MS,
          },
          ctx
        )
      );

      if (pdfResult.status === "FAILED") {
        throw new HttpException(
          {
            error: "INVOICE_PDF_RENDER_FAILED",
            message: pdfResult.errorMessage ?? "Invoice PDF rendering failed",
          },
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }

      if (pdfResult.status !== "READY") {
        throw new HttpException(
          {
            error: "INVOICE_PDF_NOT_READY",
            message: "Invoice PDF is still being generated. Please try again shortly.",
          },
          HttpStatus.CONFLICT
        );
      }
    }

    const result = await this.app.sendInvoice.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":invoiceId/payments")
  async recordPayment(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = RecordPaymentInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.recordPayment.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/cancel")
  async cancel(@Param("invoiceId") invoiceId: string, @Body() body: unknown, @Req() req: Request) {
    const input = CancelInvoiceInputSchema.parse({ ...(body as object), invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.cancelInvoice.execute(input, ctx);
    return mapResultToHttp(result).invoice;
  }

  @Post(":invoiceId/share-link")
  async generateShareLink(
    @Param("invoiceId") invoiceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = GenerateInvoiceShareLinkInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);
    const app = this.app ?? this.moduleRef?.get(InvoicesApplication, { strict: false });
    if (!app) {
      throw new Error("InvoicesApplication not available");
    }
    if (!this.extKv) {
      throw new Error("ExtKvPort not available");
    }

    const invoiceResult = await app.getInvoiceById.execute({ invoiceId }, ctx);
    const { invoice } = mapResultToHttp(invoiceResult);
    if (invoice.status === "CANCELED") {
      throw new HttpException("Cannot share canceled invoice", HttpStatus.CONFLICT);
    }

    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new HttpException("workspaceId or tenantId is required", HttpStatus.BAD_REQUEST);
    }

    const key = invoiceShareLinkKey(invoiceId);
    const existing = await this.extKv.get({
      tenantId,
      moduleId: INVOICE_SHARE_LINK_MODULE_ID,
      scope: INVOICE_SHARE_LINK_SCOPE,
      key,
    });

    const existingRecord = parseInvoiceShareLinkRecord(existing?.value);
    const token =
      existingRecord && !input.regenerate ? existingRecord.token : createInvoiceShareToken();

    if (!existingRecord || input.regenerate) {
      await this.extKv.set({
        tenantId,
        moduleId: INVOICE_SHARE_LINK_MODULE_ID,
        scope: INVOICE_SHARE_LINK_SCOPE,
        key,
        value: {
          token,
          issuedAt: new Date().toISOString(),
        },
      });
    }

    const host = req.get("host");
    const protocol = req.protocol;
    const url = `${protocol}://${host}/invoices/public/${encodeURIComponent(invoiceId)}/${encodeURIComponent(token)}`;
    return { url };
  }

  @Get(":invoiceId/share-link")
  async getShareLink(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const app = this.app ?? this.moduleRef?.get(InvoicesApplication, { strict: false });
    if (!app) {
      throw new Error("InvoicesApplication not available");
    }
    if (!this.extKv) {
      throw new Error("ExtKvPort not available");
    }

    const invoiceResult = await app.getInvoiceById.execute({ invoiceId }, ctx);
    const { invoice } = mapResultToHttp(invoiceResult);
    if (invoice.status === "CANCELED") {
      return { url: null };
    }

    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new HttpException("workspaceId or tenantId is required", HttpStatus.BAD_REQUEST);
    }

    const existing = await this.extKv.get({
      tenantId,
      moduleId: INVOICE_SHARE_LINK_MODULE_ID,
      scope: INVOICE_SHARE_LINK_SCOPE,
      key: invoiceShareLinkKey(invoiceId),
    });
    const record = parseInvoiceShareLinkRecord(existing?.value);
    if (!record) {
      return { url: null };
    }

    const host = req.get("host");
    const protocol = req.protocol;
    return {
      url: `${protocol}://${host}/invoices/public/${encodeURIComponent(invoiceId)}/${encodeURIComponent(record.token)}`,
    };
  }

  @Get(":invoiceId/pdf")
  async downloadPdf(
    @Param("invoiceId") invoiceId: string,
    @Query("waitMs") waitMsRaw: string | undefined,
    @Query("forceRegenerate") forceRegenerateRaw: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const input = RequestInvoicePdfInputSchema.parse({
      invoiceId,
      forceRegenerate: this.parseBooleanFlag(forceRegenerateRaw),
    });
    const ctx = buildUseCaseContext(req);
    const app = this.app ?? this.moduleRef?.get(InvoicesApplication, { strict: false });
    if (!app) {
      throw new Error("InvoicesApplication not available");
    }

    // Ensure invoice is accessible in current workspace context before invoking PDF pipeline.
    mapResultToHttp(await app.getInvoiceById.execute({ invoiceId: input.invoiceId }, ctx));

    const docsApp =
      this.documentsApp ?? this.moduleRef?.get(DocumentsApplication, { strict: false });
    if (!docsApp) {
      throw new Error("DocumentsApplication not available");
    }

    const waitMs = this.parseWaitMs(waitMsRaw);
    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    req.on("close", onClose);

    const requestInput = {
      invoiceId: input.invoiceId,
      forceRegenerate: input.forceRegenerate,
      waitMs,
      abortSignal: abortController.signal,
    };

    const payload = await (async () => {
      try {
        const result = await docsApp.getInvoicePdf.execute(requestInput, ctx);
        return mapResultToHttp(result);
      } finally {
        req.off("close", onClose);
      }
    })();
    if (payload.status === "FAILED") {
      throw new HttpException(
        {
          error: "INVOICE_PDF_RENDER_FAILED",
          message: payload.errorMessage ?? "Invoice PDF rendering failed",
        },
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    if (payload.status === "PENDING") {
      const retryAfterMs = payload.retryAfterMs ?? 1000;
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
      res.status(HttpStatus.ACCEPTED);
    }

    if (payload.downloadUrl?.startsWith("/")) {
      return {
        ...payload,
        downloadUrl: `${req.protocol}://${req.get("host")}${payload.downloadUrl}`,
      };
    }
    return payload;
  }

  private parseWaitMs(waitMsRaw: string | undefined): number | undefined {
    if (waitMsRaw === undefined) {
      return undefined;
    }

    const parsed = Number.parseInt(waitMsRaw, 10);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    return Math.max(0, Math.min(30000, parsed));
  }

  private parseBooleanFlag(raw: string | undefined): boolean | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
    return undefined;
  }

  @Get(":invoiceId")
  async getInvoice(@Param("invoiceId") invoiceId: string, @Req() req: Request) {
    const input = GetInvoiceByIdInputSchema.parse({ invoiceId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getInvoiceById.execute(input, ctx);
    const mapped = mapResultToHttp(result);
    // Return invoice with capabilities for RecordCommandBar

    let invoice = mapped.invoice;
    if (this.partyApp && invoice.customerPartyId) {
      try {
        const customerResult = await this.partyApp.getCustomerById.execute(
          { id: invoice.customerPartyId },
          ctx
        );
        const { customer } = mapResultToHttp(customerResult);
        invoice = { ...invoice, customer };
      } catch (error) {
        console.warn("Customer lookup failed", error);
      }
    }

    return { invoice, capabilities: mapped.capabilities };
  }

  @Get()
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query);
    const input = ListInvoicesInputSchema.parse({
      ...listQuery,
      status: typeof query.status === "string" ? query.status : undefined,
      customerPartyId:
        typeof query.customerPartyId === "string" ? query.customerPartyId : undefined,
      fromDate: typeof query.fromDate === "string" ? query.fromDate : undefined,
      toDate: typeof query.toDate === "string" ? query.toDate : undefined,
      cursor: typeof query.cursor === "string" ? query.cursor : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listInvoices.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
