import { ResendEmailSenderAdapter } from "@corely/email";
import {
  InvoiceEmailSenderPort,
  SendInvoiceEmailRequest,
  SendInvoiceEmailResponse,
} from "../../application/ports/invoice-email-sender.port";

@Injectable()
export class ResendInvoiceEmailSenderAdapter implements InvoiceEmailSenderPort {
  private readonly delegate: ResendEmailSenderAdapter;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    this.delegate = new ResendEmailSenderAdapter({
      apiKey,
      fromAddress: process.env.RESEND_FROM ?? "Qansa Billing <billing@example.com>",
      replyTo: process.env.RESEND_REPLY_TO,
    });
  }

  async sendInvoiceEmail(req: SendInvoiceEmailRequest): Promise<SendInvoiceEmailResponse> {
    const response = await this.delegate.sendEmail({
      tenantId: req.tenantId,
      to: req.to,
      cc: req.cc,
      bcc: req.bcc,
      subject: req.subject,
      html: req.html,
      text: req.text,
      attachments: req.attachments?.map((att) => ({
        filename: att.filename,
        path: att.path,
      })),
      headers: req.correlationId
        ? {
            "X-Correlation-ID": req.correlationId,
          }
        : undefined,
      idempotencyKey: req.idempotencyKey,
    });

    return {
      provider: "resend",
      providerMessageId: response.providerMessageId,
    };
  }
}
