import { Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import {
  InvoicePdfRendererPort,
  InvoicePdfModel,
} from "../../application/ports/invoice-pdf-renderer.port";

@Injectable()
export class WorkerPdfClientAdapter implements InvoicePdfRendererPort {
  private readonly logger = new Logger(WorkerPdfClientAdapter.name);

  constructor(private readonly env: EnvService) {}

  async renderInvoiceToPdf(args: {
    tenantId: string;
    invoiceId: string;
    model: InvoicePdfModel;
  }): Promise<Buffer> {
    const { tenantId, invoiceId } = args;
    const workerUrl = this.env.WORKER_API_BASE_URL;
    const workerKey = process.env.INTERNAL_WORKER_KEY;

    if (!workerUrl) {
      throw new Error("INTERNAL_WORKER_URL is not configured");
    }

    this.logger.log(`Requesting PDF for invoice ${invoiceId} from worker...`);

    const response = await fetch(`${workerUrl}/internal/invoices/${invoiceId}/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-key": workerKey || "",
      },
      body: JSON.stringify({ tenantId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Worker PDF request failed: ${response.status} ${errorText}`);
      throw new Error(`Failed to generate PDF via worker: ${response.statusText}`);
    }

    // The worker currently returns metadata, but the port expects Buffer.
    // Wait! Phase 4.3 says "Return { objectKey, sizeBytes, contentType, signedUrl? }".
    // But Phase 4.4 says "replaces Playwright adapter". Playwright adapter returns Buffer.

    // If the port expects Buffer, I should probably download the file from the signedUrl or have the worker return the bytes.
    // However, Phase 4.2 says "return { objectKey... }".

    const result = (await response.json()) as { objectKey?: string; signedUrl?: string };
    this.logger.log(`Worker PDF generated: ${result.objectKey}`);

    // If the API really needs the Buffer, it has to fetch it.
    if (result.signedUrl) {
      const fileRes = await fetch(result.signedUrl);
      if (!fileRes.ok) {
        throw new Error("Failed to download generated PDF from storage");
      }
      const arrayBuffer = await fileRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    throw new Error("Worker did not return a signed URL to download the PDF");
  }
}
