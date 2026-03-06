import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  type ObjectStoragePort,
  OBJECT_STORAGE_PORT,
  type DocumentRepoPort,
  type FileRepoPort,
} from "@corely/kernel";
import { PrismaDocumentRepoAdapter, PrismaFileRepoAdapter } from "@corely/data";
import { type InvoicePdfModelPort } from "../application/ports/invoice-pdf-model.port";
import { type InvoicePdfRendererPort } from "../application/ports/invoice-pdf-renderer.port";
import { INVOICE_PDF_MODEL_PORT, INVOICE_PDF_RENDERER_PORT } from "../tokens";

type EventPayload = {
  tenantId: string;
  invoiceId: string;
  documentId: string;
  fileId: string;
};

@Injectable()
export class GenerateInvoicePdfWorker {
  private readonly logger = new Logger(GenerateInvoicePdfWorker.name);

  constructor(
    @Inject(PrismaDocumentRepoAdapter) private readonly documentRepo: PrismaDocumentRepoAdapter,
    @Inject(PrismaFileRepoAdapter) private readonly fileRepo: PrismaFileRepoAdapter,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort,
    @Inject(INVOICE_PDF_MODEL_PORT) private readonly invoicePdfModel: InvoicePdfModelPort,
    @Inject(INVOICE_PDF_RENDERER_PORT) private readonly pdfRenderer: InvoicePdfRendererPort
  ) {}

  async handle(event: EventPayload) {
    const { tenantId, invoiceId, documentId, fileId } = event;
    const document = await this.documentRepo.findById(tenantId, documentId);
    const file = await this.fileRepo.findById(tenantId, fileId);

    if (!document || !file || file.documentId !== document.id) {
      this.logger.error("generate_invoice_pdf.missing_document_or_file", {
        documentId,
        fileId,
        tenantId,
      });
      return;
    }

    if (document.status === "READY" && file.contentType === "application/pdf" && !!file.sizeBytes) {
      this.logger.log("generate_invoice_pdf.already_ready", {
        tenantId,
        invoiceId,
        documentId,
        fileId,
      });
      return;
    }

    try {
      const model = await this.invoicePdfModel.getInvoicePdfModel(tenantId, invoiceId);
      if (!model) {
        throw new Error("Invoice model not found");
      }

      const pdfBytes = await this.pdfRenderer.renderInvoiceToPdf({
        tenantId,
        invoiceId,
        model,
      });

      const upload = await this.objectStorage.putObject({
        tenantId,
        objectKey: file.objectKey,
        contentType: "application/pdf",
        bytes: pdfBytes,
      });

      file.markUploaded({
        sizeBytes: upload.sizeBytes,
        contentType: "application/pdf",
      });
      document.markReady(new Date());

      await this.fileRepo.save(file);
      await this.documentRepo.save(document);
    } catch (error) {
      this.logger.error("generate_invoice_pdf.failed", {
        tenantId,
        invoiceId,
        documentId,
        error,
      });
      document.markFailed(
        error instanceof Error ? error.message : "PDF generation failed",
        new Date()
      );
      await this.documentRepo.save(document);
      throw error;
    }
  }
}
