import { Resend } from "resend";
import { renderEmail, PortalOtpEmail, buildPortalOtpEmailSubject } from "@corely/email-templates";
import type { SsoEmailPort } from "../../application/ports/sso-email.port";

export class ResendSsoEmailAdapter implements SsoEmailPort {
  private readonly resend: Resend;
  constructor(
    apiKey: string,
    private readonly from: string,
    private readonly replyTo?: string
  ) {
    this.resend = new Resend(apiKey);
  }
  async sendCode(input: Parameters<SsoEmailPort["sendCode"]>[0]) {
    const props = {
      code: input.code,
      expiryMinutes: input.expiryMinutes,
      audience: "account" as const,
    };
    const rendered = await renderEmail(PortalOtpEmail(props));
    const { data, error } = await this.resend.emails.send(
      {
        from: this.from,
        to: [input.to],
        subject: buildPortalOtpEmailSubject(props),
        html: rendered.html,
        text: rendered.text,
        ...(this.replyTo ? { replyTo: this.replyTo } : {}),
      },
      { idempotencyKey: input.idempotencyKey }
    );
    if (error || !data?.id) {
      throw new Error("SSO email delivery unavailable");
    }
  }
}
