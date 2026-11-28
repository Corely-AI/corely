import { Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { Resend } from "resend";
import { MAX_INBOUND_ATTACHMENT_BYTES } from "./receipt-attachment";

@Injectable()
export class ResendAttachmentAdapter {
  private readonly client: Resend | undefined;

  constructor(env: EnvService) {
    this.client = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : undefined;
  }

  async download(emailId: string, id: string): Promise<Buffer | null> {
    const response = await this.client?.emails.receiving.attachments.get({ emailId, id });
    const attachment = response?.data;
    if (!attachment) {
      throw new Error("Inbound attachment unavailable from provider");
    }
    if (
      attachment.size > MAX_INBOUND_ATTACHMENT_BYTES ||
      attachment.content_disposition === "inline"
    ) {
      return null;
    }
    const url = new URL(attachment.download_url);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Invalid inbound attachment URL from provider");
    }
    const download = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!download.ok || !download.body) {
      throw new Error("Inbound attachment download failed");
    }
    const reader = download.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) {
          return Buffer.concat(chunks, bytes);
        }
        bytes += chunk.value.length;
        if (bytes > MAX_INBOUND_ATTACHMENT_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
  }
}
