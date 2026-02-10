import { Injectable, Logger, Inject } from "@nestjs/common";
import { type InvoicePdfModelPort } from "./ports/invoice-pdf-model.port";
import { type InvoicePdfRendererPort } from "./ports/invoice-pdf-renderer.port";
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from "@corely/kernel";
import {
  PrismaDocumentRepoAdapter,
  PrismaFileRepoAdapter,
  PrismaDocumentLinkAdapter,
} from "@corely/data";
import { INVOICE_PDF_MODEL_PORT, INVOICE_PDF_RENDERER_PORT } from "../tokens";

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    @Inject(INVOICE_PDF_MODEL_PORT) private readonly pdfModel: InvoicePdfModelPort,
    @Inject(INVOICE_PDF_RENDERER_PORT) private readonly pdfRenderer: InvoicePdfRendererPort,
    @Inject(PrismaDocumentRepoAdapter) private readonly documentRepo: PrismaDocumentRepoAdapter,
    @Inject(PrismaFileRepoAdapter) private readonly fileRepo: PrismaFileRepoAdapter,
    @Inject(PrismaDocumentLinkAdapter) private readonly docLinkRepo: PrismaDocumentLinkAdapter,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort
  ) {}

  async generateAndStore(params: {
    tenantId: string;
    invoiceId: string;
  }): Promise<{ objectKey: string; sizeBytes: number; contentType: string; signedUrl: string }> {
    const { tenantId, invoiceId } = params;

    const model = await this.pdfModel.getInvoicePdfModel(tenantId, invoiceId);
    if (!model) {
      throw new Error(`Invoice model not found for ${invoiceId}`);
    }

    const pdfBytes = await this.pdfRenderer.renderInvoiceToPdf({
      tenantId,
      invoiceId,
      model,
    });

    const objectKey = `workspaces/${tenantId}/invoices/${invoiceId}.pdf`;
    const upload = await this.storage.putObject({
      tenantId,
      objectKey,
      contentType: "application/pdf",
      bytes: pdfBytes,
    });

    const signedUrl = await this.storage.createSignedDownloadUrl({
      tenantId,
      objectKey,
      expiresInSeconds: 3600,
    });

    return {
      objectKey,
      sizeBytes: upload.sizeBytes,
      contentType: "application/pdf",
      signedUrl: signedUrl.url,
    };
  }
}
