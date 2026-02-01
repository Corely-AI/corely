import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  RequireTenant,
  ok,
  err,
  ValidationError,
  NotFoundError,
  UseCaseError,
} from "@corely/kernel";
import type { InvoiceRepoPort } from "../../ports/invoice-repository.port";
import type { InvoicePdfModelPort } from "../../ports/invoice-pdf-model.port";
import type { InvoicePdfRendererPort } from "../../ports/invoice-pdf-renderer.port";
import type { ObjectStoragePort } from "../../../../documents/application/ports/object-storage.port";
import { INVOICE_PDF_MODEL_PORT } from "../../ports/invoice-pdf-model.port";
import { INVOICE_PDF_RENDERER_PORT } from "../../ports/invoice-pdf-renderer.port";
import * as fs from "fs/promises";
import * as path from "path";

export type DownloadInvoicePdfInput = {
  invoiceId: string;
};

export type DownloadInvoicePdfOutput = {
  downloadUrl: string;
  expiresAt: Date;
};

@RequireTenant()
@Injectable()
export class DownloadInvoicePdfUseCase extends BaseUseCase<
  DownloadInvoicePdfInput,
  DownloadInvoicePdfOutput
> {
  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    @Inject(INVOICE_PDF_MODEL_PORT) private readonly pdfModelPort: InvoicePdfModelPort,
    @Inject(INVOICE_PDF_RENDERER_PORT) private readonly rendererPort: InvoicePdfRendererPort,
    private readonly storagePort: ObjectStoragePort,
    @Inject("LoggerPort") logger: LoggerPort
  ) {
    super({ logger });
  }

  protected async handle(
    input: DownloadInvoicePdfInput,
    ctx: UseCaseContext
  ): Promise<Result<DownloadInvoicePdfOutput, UseCaseError>> {
    const { invoiceId } = input;
    const { workspaceId } = ctx;

    if (!workspaceId) {
      return err(new ValidationError("workspaceId is required in context"));
    }

    // 1. Authorize: Fetch invoice using workspaceId
    const invoice = await this.invoiceRepo.findById(workspaceId, invoiceId);
    if (!invoice) {
      return err(new NotFoundError(`Invoice not found: ${invoiceId}`));
    }

    // 3. Check if valid PDF exists
    const currentSourceVersion = invoice.updatedAt.toISOString();

    if (invoice.isPdfReady()) {
      this.deps.logger.info(`PDF already exists for invoice ${invoiceId}, returning signed URL`);
      return ok(await this.createSignedDownloadUrl(workspaceId, invoice.pdfStorageKey!));
    }

    // 4. Generate and store PDF
    this.deps.logger.info(
      `Generating PDF for invoice ${invoiceId} (sourceVersion: ${currentSourceVersion})`
    );

    // 4a. Mark generating
    const now = new Date();
    invoice.markPdfGenerating(currentSourceVersion, now);
    await this.invoiceRepo.save(workspaceId, invoice);

    try {
      // 4b. Fetch PDF model
      // We pass workspaceId as tenantId here because we want to load invoice/settings from the workspace scope
      const model = await this.pdfModelPort.getInvoicePdfModel(workspaceId, invoiceId);
      if (!model) {
        return err(
          new UseCaseError("PDF_MODEL_ERROR", "Invoice data incomplete for PDF generation")
        );
      }

      // 4c. Render PDF
      const pdfBytes = await this.rendererPort.renderInvoiceToPdf({
        tenantId: workspaceId,
        invoiceId,
        model: {
          ...model,
          paymentSnapshot: model.paymentSnapshot
            ? {
                ...model.paymentSnapshot,
                type: (model.paymentSnapshot.type as any) || "BANK_TRANSFER",
                label: model.paymentSnapshot.label || "Default",
                referenceText: model.paymentSnapshot.referenceText || "",
              }
            : undefined,
        },
      });

      // 4d. Save to local folder first
      const storageKey = this.buildStorageKey(
        workspaceId,
        invoiceId,
        invoice.number!,
        currentSourceVersion
      );
      const localFilename = this.buildLocalFilename(invoiceId, invoice.number!);
      await this.savePdfToLocalFolder(workspaceId, localFilename, pdfBytes);

      // 4e. Upload to GCS
      try {
        await this.storagePort.putObject({
          tenantId: workspaceId,
          objectKey: storageKey,
          contentType: "application/pdf",
          bytes: pdfBytes,
        });
      } catch (error) {
        if (this.isMissingStorageCredentials(error)) {
          this.deps.logger.warn(
            `Storage credentials missing; serving local PDF for invoice ${invoiceId}`
          );
          return ok(
            await this.finalizeLocalPdf(invoice, workspaceId, currentSourceVersion, localFilename)
          );
        }
        throw error;
      }

      // 4e. Mark PDF ready
      invoice.markPdfGenerated({
        storageKey,
        generatedAt: new Date(),
        sourceVersion: currentSourceVersion,
        now: new Date(),
      });
      await this.invoiceRepo.save(workspaceId, invoice);

      this.deps.logger.info(`PDF generated successfully for invoice ${invoiceId}`);

      // 5. Return signed download URL
      try {
        return ok(await this.createSignedDownloadUrl(workspaceId, storageKey));
      } catch (error) {
        if (this.isMissingStorageCredentials(error)) {
          this.deps.logger.warn(
            `Storage credentials missing during signing; serving local PDF for invoice ${invoiceId}`
          );
          return ok(
            await this.finalizeLocalPdf(invoice, workspaceId, currentSourceVersion, localFilename)
          );
        }
        throw error;
      }
    } catch (error) {
      this.deps.logger.error(`PDF generation failed for invoice ${invoiceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      invoice.markPdfFailed(
        error instanceof Error ? error.message : "PDF generation failed",
        new Date()
      );
      await this.invoiceRepo.save(workspaceId, invoice);
      return err(
        new UseCaseError(
          "PDF_GENERATION_FAILED",
          error instanceof Error ? error.message : "PDF generation failed"
        )
      );
    }
  }

  private async savePdfToLocalFolder(
    tenantId: string,
    filename: string,
    pdfBytes: Uint8Array
  ): Promise<void> {
    try {
      // Create pdfs directory in the current working directory
      const pdfsDir = path.join(process.cwd(), "pdfs");
      await fs.mkdir(pdfsDir, { recursive: true });

      const filePath = path.join(pdfsDir, filename);

      // Write the PDF to the local file
      await fs.writeFile(filePath, pdfBytes);

      this.deps.logger.info(`PDF saved locally for tenant ${tenantId}: ${filePath}`);
    } catch (error) {
      this.deps.logger.error(`Failed to save PDF locally for tenant ${tenantId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - we still want to upload to GCS even if local save fails
    }
  }

  private buildLocalFilename(invoiceId: string, invoiceNumber: string): string {
    const sanitizedNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-");
    return `invoice-${sanitizedNumber}-${invoiceId}.pdf`;
  }

  private buildStorageKey(
    tenantId: string,
    invoiceId: string,
    invoiceNumber: string,
    sourceVersion: string
  ): string {
    // Sanitize invoice number for filename
    const sanitizedNumber = invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, "-");
    return `tenants/${tenantId}/invoices/${invoiceId}/invoice-${sanitizedNumber}-${sourceVersion}.pdf`;
  }

  private async createSignedDownloadUrl(
    tenantId: string,
    storageKey: string
  ): Promise<DownloadInvoicePdfOutput> {
    if (storageKey.startsWith("local:")) {
      const filename = storageKey.slice("local:".length);
      return {
        downloadUrl: `/__local/pdfs/${filename}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    }

    const signedDownload = await this.storagePort.createSignedDownloadUrl({
      tenantId,
      objectKey: storageKey,
      expiresInSeconds: 900, // 15 minutes
    });

    return {
      downloadUrl: signedDownload.url,
      expiresAt: signedDownload.expiresAt,
    };
  }

  private async finalizeLocalPdf(
    invoice: any,
    tenantId: string, // actually workspaceId
    sourceVersion: string,
    filename: string
  ): Promise<DownloadInvoicePdfOutput> {
    const storageKey = `local:${filename}`;
    invoice.markPdfGenerated({
      storageKey,
      generatedAt: new Date(),
      sourceVersion,
      now: new Date(),
    });
    // Cast strict type
    await this.invoiceRepo.save(tenantId, invoice as any);
    return this.createSignedDownloadUrl(tenantId, storageKey);
  }

  private isMissingStorageCredentials(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Could not load the default credentials");
  }
}
