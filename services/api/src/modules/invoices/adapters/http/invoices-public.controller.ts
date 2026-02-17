import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Optional,
  Param,
  Res,
} from "@nestjs/common";
import { EXT_KV_PORT, PrismaService, type ExtKvPort } from "@corely/data";
import type { Response } from "express";
import { ModuleRef } from "@nestjs/core";
import { mapResultToHttp } from "./mappers";
import { DocumentsApplication } from "../../../documents/application/documents.application";
import {
  INVOICE_SHARE_LINK_MODULE_ID,
  INVOICE_SHARE_LINK_SCOPE,
  invoiceShareLinkKey,
  invoiceShareTokenMatches,
  parseInvoiceShareLinkRecord,
} from "./invoice-share-link.utils";

@Controller("invoices/public")
export class InvoicesPublicController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXT_KV_PORT) private readonly extKv: ExtKvPort,
    @Inject(DocumentsApplication)
    @Optional()
    private readonly documentsApp: DocumentsApplication | null,
    @Optional() private readonly moduleRef?: ModuleRef
  ) {}

  @Get(":invoiceId/:token")
  async openSharedInvoice(
    @Param("invoiceId") invoiceId: string,
    @Param("token") token: string,
    @Res() res: Response
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!invoice || invoice.status === "CANCELED") {
      throw new NotFoundException("Invoice link not found");
    }

    const entry = await this.extKv.get({
      tenantId: invoice.tenantId,
      moduleId: INVOICE_SHARE_LINK_MODULE_ID,
      scope: INVOICE_SHARE_LINK_SCOPE,
      key: invoiceShareLinkKey(invoiceId),
    });
    const record = parseInvoiceShareLinkRecord(entry?.value);
    if (!record || !invoiceShareTokenMatches(record.token, token)) {
      throw new NotFoundException("Invoice link not found");
    }

    const docsApp =
      this.documentsApp ?? this.moduleRef?.get(DocumentsApplication, { strict: false });
    if (!docsApp) {
      throw new Error("DocumentsApplication not available");
    }

    const result = await docsApp.getInvoicePdf.execute(
      {
        invoiceId,
        waitMs: 30_000,
      },
      {
        tenantId: invoice.tenantId,
        workspaceId: invoice.tenantId,
        requestId: `invoice-public-link:${invoiceId}`,
        correlationId: `invoice-public-link:${invoiceId}`,
        metadata: { source: "invoice-public-link" },
      }
    );
    const payload = mapResultToHttp(result);

    if (payload.status === "READY" && payload.downloadUrl) {
      return res.redirect(payload.downloadUrl);
    }

    if (payload.status === "FAILED") {
      throw new HttpException(
        payload.errorMessage ?? "Invoice PDF generation failed",
        HttpStatus.UNPROCESSABLE_ENTITY
      );
    }

    return res.status(HttpStatus.ACCEPTED).json({
      status: "PENDING",
      message: "Invoice PDF is being prepared. Please refresh shortly.",
    });
  }
}
