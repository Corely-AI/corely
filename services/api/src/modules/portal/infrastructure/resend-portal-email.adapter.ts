import { Resend, type CreateEmailOptions } from "resend";
import {
  renderEmail,
  PortalOtpEmail,
  buildPortalOtpEmailSubject,
  PortalInviteEmail,
  buildPortalInviteEmailSubject,
} from "@corely/email-templates";
import type {
  PortalEmailPort,
  PortalOtpEmailRequest,
  PortalInviteEmailRequest,
} from "../application/ports/portal-email.port";

export class ResendPortalEmailAdapter implements PortalEmailPort {
  private resend: Resend;
  private fromAddress: string;
  private replyTo?: string;

  constructor(apiKey?: string, fromAddress?: string, replyTo?: string) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required for portal email adapter");
    }
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress ?? "Corely <no-reply@example.com>";
    this.replyTo = replyTo ?? undefined;
  }

  async sendOtpCode(request: PortalOtpEmailRequest): Promise<void> {
    const props = { code: request.code, expiryMinutes: request.expiryMinutes };
    const subject = buildPortalOtpEmailSubject(props);
    const { html, text } = await renderEmail(PortalOtpEmail(props));

    const emailOptions: CreateEmailOptions = {
      from: this.fromAddress,
      to: [request.to],
      subject,
      html,
      text,
      ...(this.replyTo ? { replyTo: this.replyTo } : {}),
    };

    const sendOptions: { idempotencyKey: string } | undefined = request.idempotencyKey
      ? { idempotencyKey: request.idempotencyKey }
      : undefined;

    const { error } = await this.resend.emails.send(emailOptions, sendOptions);

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
  }

  async sendInvite(request: PortalInviteEmailRequest): Promise<void> {
    const props = {
      portalUrl: request.portalUrl,
      studentName: request.studentName,
    };
    const subject = buildPortalInviteEmailSubject(props);
    const { html, text } = await renderEmail(PortalInviteEmail(props));

    const emailOptions: CreateEmailOptions = {
      from: this.fromAddress,
      to: [request.to],
      subject,
      html,
      text,
      ...(this.replyTo ? { replyTo: this.replyTo } : {}),
    };

    const { error } = await this.resend.emails.send(emailOptions);

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
  }
}
