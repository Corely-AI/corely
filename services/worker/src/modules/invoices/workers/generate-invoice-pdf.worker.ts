import { Logger } from "@nestjs/common";
import type { DocumentRepoPort } from "@/modules/documents/application/ports/document-repository.port";
import type { FileRepoPort } from "@/modules/documents/application/ports/file-repository.port";
import type { ObjectStoragePort } from "@/modules/documents/application/ports/object-storage.port";
import type { InvoicePdfModelPort } from "@/modules/invoices/application/ports/invoice-pdf-model.port";
import type { InvoicePdfRendererPort } from "@/modules/invoices/application/ports/invoice-pdf-renderer.port";

type EventPayload = {
  tenantId: string;
  invoiceId: string;
  documentId: string;
  fileId: string;
};

type Deps = {
  documentRepo: DocumentRepoPort;
  fileRepo: FileRepoPort;
  objectStorage: ObjectStoragePort;
  invoicePdfModel: InvoicePdfModelPort;
  pdfRenderer: InvoicePdfRendererPort;
};

export class GenerateInvoicePdfWorker {
  private readonly logger = new Logger(GenerateInvoicePdfWorker.name);

  constructor(private readonly deps: Deps) {}

  async handle(event: EventPayload) {
    const { tenantId, invoiceId, documentId, fileId } = event;
    const document = await this.deps.documentRepo.findById(tenantId, documentId);
    const file = await this.deps.fileRepo.findById(tenantId, fileId);

    if (!document || !file || file.documentId !== document.id) {
      this.logger.error("generate_invoice_pdf.missing_document_or_file", {
        documentId,
        fileId,
        tenantId,
      });
      return;
    }

    try {
      const model = await this.deps.invoicePdfModel.getInvoicePdfModel(tenantId, invoiceId);
      if (!model) {
        throw new Error("Invoice model not found");
      }

      const pdfBytes = await this.deps.pdfRenderer.renderInvoiceToPdf({
        tenantId,
        invoiceId,
        model,
      });

      const upload = await this.deps.objectStorage.putObject({
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

      await this.deps.fileRepo.save(file);
      await this.deps.documentRepo.save(document);
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
      await this.deps.documentRepo.save(document);
      throw error;
    }
  }
}
