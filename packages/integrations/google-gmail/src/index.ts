import {
  type EmailSyncResult,
  IntegrationsHttpClient,
  type NormalizedEmailAddress,
  type NormalizedEmailMessage,
} from "@corely/integrations-core";
import { Buffer } from "node:buffer";

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  historyId?: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  id: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: {
      data?: string;
    };
    parts?: Array<{
      mimeType?: string;
      body?: { data?: string };
    }>;
  };
}

export interface GmailSendInput {
  accessToken: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
}

export interface GmailSyncInput {
  accessToken: string;
  pageToken?: string;
  maxResults?: number;
  query?: string;
}

export class GoogleGmailClient {
  private readonly client: IntegrationsHttpClient;

  constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
    this.client = new IntegrationsHttpClient({
      baseUrl: options?.baseUrl ?? "https://gmail.googleapis.com",
      provider: "google_gmail",
      ...(options?.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    });
  }

  async sendMail(input: GmailSendInput): Promise<{ providerMessageId: string }> {
    const raw = this.encodeRawMessage(input);
    const response = await this.client.request<{ id: string }>({
      path: "/gmail/v1/users/me/messages/send",
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      body: {
        raw,
      },
    });

    return { providerMessageId: response.id };
  }

  async syncMailbox(input: GmailSyncInput): Promise<EmailSyncResult> {
    const list = await this.client.request<GmailListResponse>({
      path: "/gmail/v1/users/me/messages",
      method: "GET",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      query: {
        maxResults: input.maxResults ?? 50,
        pageToken: input.pageToken,
        q: input.query,
      },
    });

    const messages = await Promise.all(
      (list.messages ?? []).map(async (messageRef: { id: string; threadId: string }) => {
        const message = await this.client.request<GmailMessageResponse>({
          path: `/gmail/v1/users/me/messages/${messageRef.id}`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
          },
          query: {
            format: "metadata",
            metadataHeaders: "From,To,Cc,Bcc,Subject,Date",
          },
        });
        return this.normalizeMessage(message);
      })
    );

    return {
      messages,
      cursor: list.nextPageToken ?? list.historyId ?? null,
    };
  }

  private encodeRawMessage(input: GmailSendInput): string {
    const lines: string[] = [];
    lines.push(`To: ${input.to.join(", ")}`);
    if (input.cc?.length) {
      lines.push(`Cc: ${input.cc.join(", ")}`);
    }
    if (input.bcc?.length) {
      lines.push(`Bcc: ${input.bcc.join(", ")}`);
    }
    lines.push(`Subject: ${input.subject}`);

    if (input.html) {
      lines.push('Content-Type: text/html; charset="UTF-8"');
      lines.push("");
      lines.push(input.html);
    } else {
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push("");
      lines.push(input.text ?? "");
    }

    const raw = lines.join("\r\n");
    return Buffer.from(raw)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private normalizeMessage(message: GmailMessageResponse): NormalizedEmailMessage {
    const headers = new Map(
      (message.payload?.headers ?? []).map((header) => [header.name, header.value])
    );

    return {
      externalId: message.id,
      threadId: message.threadId ?? null,
      from: this.parseSingleAddress(headers.get("From")),
      to: this.parseAddressList(headers.get("To")),
      cc: this.parseAddressList(headers.get("Cc")),
      bcc: this.parseAddressList(headers.get("Bcc")),
      subject: headers.get("Subject") ?? "",
      snippet: message.snippet ?? null,
      bodyPreview: message.snippet ?? null,
      sentAt: headers.get("Date") ?? null,
      receivedAt: message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : null,
    };
  }

  private parseSingleAddress(value?: string): NormalizedEmailAddress | null {
    const parsed = this.parseAddressList(value);
    return parsed[0] ?? null;
  }

  private parseAddressList(value?: string): NormalizedEmailAddress[] {
    if (!value) {
      return [];
    }

    return value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => {
        const match = part.match(/^(.*)<([^>]+)>$/);
        if (match) {
          return {
            name: match[1].trim().replace(/^"|"$/g, "") || null,
            email: match[2].trim(),
          };
        }
        return { name: null, email: part };
      });
  }
}
