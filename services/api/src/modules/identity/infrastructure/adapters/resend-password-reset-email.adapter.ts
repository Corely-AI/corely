import { Resend, type CreateEmailOptions } from "resend";
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

    const emailOptions: CreateEmailOptions = {
      from: this.fromAddress,
      to: [request.to],
      subject,
      html,
      text,
      ...(this.replyTo ? { replyTo: this.replyTo } : {}),
      ...(request.correlationId ? { headers: { "X-Correlation-ID": request.correlationId } } : {}),
    };

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
