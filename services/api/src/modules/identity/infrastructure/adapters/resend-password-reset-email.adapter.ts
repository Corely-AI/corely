import { Resend } from "resend";
import {
  renderEmail,
  PasswordResetEmail,
  buildPasswordResetEmailSubject,
} from "@corely/email-templates";
import type {
  PasswordResetEmailPort,
  PasswordResetEmailRequest,
} from "../../application/ports/password-reset-email.port";

export class ResendPasswordResetEmailAdapter implements PasswordResetEmailPort {
  private resend!: Resend;
  private fromAddress!: string;
  private replyTo?: string;

  constructor(apiKey?: string, fromAddress?: string, replyTo?: string) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required");
    }
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress ?? "Corely <no-reply@example.com>";
    this.replyTo = replyTo ?? undefined;
  }

  async send(request: PasswordResetEmailRequest): Promise<void> {
    const props = { resetUrl: request.resetUrl };
    const subject = buildPasswordResetEmailSubject(props);
    const { html, text } = await renderEmail(PasswordResetEmail(props));

    const emailOptions: {
      from: string;
      to: string[];
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
      headers?: Record<string, string>;
    } = {
      from: this.fromAddress,
      to: [request.to],
      subject,
      html,
      text,
    };

    if (this.replyTo) {
      emailOptions.replyTo = this.replyTo;
    }
    if (request.correlationId) {
      emailOptions.headers = { "X-Correlation-ID": request.correlationId };
    }

    const sendOptions: { idempotencyKey: string } | undefined = request.idempotencyKey
      ? { idempotencyKey: request.idempotencyKey }
      : undefined;

    const { data, error } = await this.resend.emails.send(emailOptions, sendOptions);

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("Resend API did not return an email ID");
    }
  }
}
