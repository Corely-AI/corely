import { Resend } from "resend";
import {
  type EmailSenderPort,
  type SendEmailRequest,
  type SendEmailResponse,
} from "@corely/kernel";

export type ResendConfig = {
  apiKey: string;
  fromAddress?: string;
  replyTo?: string;
};

export class ResendEmailSenderAdapter implements EmailSenderPort {
  private readonly resend: Resend;
  private readonly fromAddress: string;
  private readonly replyTo?: string;

  constructor(config: ResendConfig) {
    if (!config.apiKey) {
      throw new Error("Resend API key is required");
    }
    this.resend = new Resend(config.apiKey);
    this.fromAddress = config.fromAddress ?? "Notifications <notifications@example.com>";
    this.replyTo = config.replyTo;
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const emailOptions: any = {
      from: this.fromAddress,
      to: request.to,
      subject: request.subject,
      html: request.html,
      text: request.text,
    };

    if (request.cc?.length) {
      emailOptions.cc = request.cc;
    }
    if (request.bcc?.length) {
      emailOptions.bcc = request.bcc;
    }
    if (request.replyTo || this.replyTo) {
      emailOptions.replyTo = request.replyTo ?? this.replyTo;
    }
    if (request.headers) {
      emailOptions.headers = request.headers;
    }
    if (request.attachments?.length) {
      emailOptions.attachments = request.attachments.map((att) => ({
        filename: att.filename,
        path: att.path,
        content: att.content,
        contentType: att.mimeType,
      }));
    }

    const { data, error } = await this.resend.emails.send(emailOptions, {
      idempotencyKey: request.idempotencyKey,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("Resend API did not return an email ID");
    }

    return { provider: "resend", providerMessageId: data.id };
  }
}
