import { IntegrationsHttpClient } from "@corely/integrations-core";

export interface ResendMailSendInput {
  apiKey: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export class ResendMailClient {
  private readonly client: IntegrationsHttpClient;

  constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
    this.client = new IntegrationsHttpClient({
      baseUrl: options?.baseUrl ?? "https://api.resend.com",
      provider: "resend",
      ...(options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    });
  }

  async sendMail(input: ResendMailSendInput): Promise<{ providerMessageId: string }> {
    const response = await this.client.request<{ id: string }>({
      path: "/emails",
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: {
        from: input.from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      },
    });

    return { providerMessageId: response.id };
  }
}
