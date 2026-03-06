import { Logger } from "@nestjs/common";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { type GenerateInvoicePdfWorker } from "../workers/generate-invoice-pdf.worker";

type Payload = {
  tenantId: string;
  invoiceId: string;
  documentId: string;
  fileId: string;
};

export class InvoicePdfRenderRequestedHandler implements EventHandler {
  readonly eventType = "invoice.pdf.render.requested";
  private readonly logger = new Logger(InvoicePdfRenderRequestedHandler.name);

  constructor(private readonly worker: GenerateInvoicePdfWorker) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = { ...(event.payload as Payload), tenantId: event.tenantId };
    if (!payload?.tenantId || !payload?.invoiceId || !payload?.documentId || !payload?.fileId) {
      this.logger.error("invoice_pdf_render.invalid_payload", { payload });
      return;
    }

    await this.worker.handle(payload);
  }
}
