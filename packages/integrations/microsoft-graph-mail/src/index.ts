import {
  type EmailSyncResult,
  IntegrationsHttpClient,
  type NormalizedEmailAddress,
  type NormalizedEmailMessage,
} from "@corely/integrations-core";

interface GraphRecipient {
  emailAddress?: {
    name?: string;
    address?: string;
  };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  sentDateTime?: string;
  receivedDateTime?: string;
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  bccRecipients?: GraphRecipient[];
}

interface GraphListResponse {
  value: GraphMessage[];
  "@odata.deltaLink"?: string;
  "@odata.nextLink"?: string;
}

export interface GraphMailSendInput {
  accessToken: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
}

export interface GraphMailSyncInput {
  accessToken: string;
  mailboxUserId?: string;
  deltaLink?: string;
  top?: number;
}

export class MicrosoftGraphMailClient {
  private readonly client: IntegrationsHttpClient;

  constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
    this.client = new IntegrationsHttpClient({
      baseUrl: options?.baseUrl ?? "https://graph.microsoft.com",
      provider: "microsoft_graph_mail",
      timeoutMs: options?.timeoutMs,
    });
  }

  async sendMail(input: GraphMailSendInput): Promise<{ providerMessageId?: string }> {
    await this.client.request<void>({
      path: "/v1.0/me/sendMail",
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: {
        message: {
          subject: input.subject,
          body: {
            contentType: input.html ? "HTML" : "Text",
            content: input.html ?? input.text ?? "",
          },
          toRecipients: input.to.map((address) => ({
            emailAddress: { address },
          })),
          ccRecipients: (input.cc ?? []).map((address) => ({
            emailAddress: { address },
          })),
          bccRecipients: (input.bcc ?? []).map((address) => ({
            emailAddress: { address },
          })),
        },
        saveToSentItems: true,
      },
    });

    // Graph sendMail endpoint returns 202 with no body.
    return {};
  }

  async syncMailbox(input: GraphMailSyncInput): Promise<EmailSyncResult> {
    const path = input.deltaLink
      ? input.deltaLink.replace(/^https?:\/\/graph.microsoft.com/, "")
      : "/v1.0/me/mailFolders/inbox/messages/delta";

    const response = await this.client.request<GraphListResponse>({
      path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      query: input.deltaLink
        ? undefined
        : {
            $top: input.top ?? 50,
            $select:
              "id,conversationId,subject,bodyPreview,sentDateTime,receivedDateTime,from,toRecipients,ccRecipients,bccRecipients",
          },
    });

    return {
      messages: response.value.map((message) => this.normalizeMessage(message)),
      cursor: response["@odata.deltaLink"] ?? response["@odata.nextLink"] ?? null,
    };
  }

  private normalizeMessage(message: GraphMessage): NormalizedEmailMessage {
    return {
      externalId: message.id,
      threadId: message.conversationId ?? null,
      from: this.normalizeAddress(message.from?.emailAddress),
      to: this.normalizeAddresses(message.toRecipients),
      cc: this.normalizeAddresses(message.ccRecipients),
      bcc: this.normalizeAddresses(message.bccRecipients),
      subject: message.subject ?? "",
      snippet: message.bodyPreview ?? null,
      bodyPreview: message.bodyPreview ?? null,
      sentAt: message.sentDateTime ?? null,
      receivedAt: message.receivedDateTime ?? null,
    };
  }

  private normalizeAddresses(recipients?: GraphRecipient[]): NormalizedEmailAddress[] {
    if (!recipients) {
      return [];
    }

    return recipients
      .map((recipient) => this.normalizeAddress(recipient.emailAddress))
      .filter((address): address is NormalizedEmailAddress => Boolean(address));
  }

  private normalizeAddress(
    emailAddress?: { name?: string; address?: string } | null
  ): NormalizedEmailAddress | null {
    if (!emailAddress?.address) {
      return null;
    }

    return {
      name: emailAddress.name ?? null,
      email: emailAddress.address,
    };
  }
}
