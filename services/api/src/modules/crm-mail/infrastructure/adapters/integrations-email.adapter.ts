import { Injectable } from "@nestjs/common";
import type { EmailSyncResult } from "@corely/integrations-core";
import { IntegrationsEmailProviderService } from "../../../integrations";
import type { EmailSendPort } from "../../application/ports/email-send.port";
import type { EmailInboxPort } from "../../application/ports/email-inbox.port";

@Injectable()
export class IntegrationsEmailAdapter implements EmailSendPort, EmailInboxPort {
  constructor(private readonly provider: IntegrationsEmailProviderService) {}

  async send(input: {
    mailboxId: string;
    connectionId: string;
    tenantId: string;
    providerKind: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
  }): Promise<{ providerMessageId?: string }> {
    return this.provider.send({
      tenantId: input.tenantId,
      connectionId: input.connectionId,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  async syncMailbox(input: {
    mailboxId: string;
    connectionId: string;
    tenantId: string;
    providerKind: string;
    cursor?: string | null;
    limit?: number;
    since?: string;
  }): Promise<EmailSyncResult> {
    return this.provider.sync({
      tenantId: input.tenantId,
      connectionId: input.connectionId,
      cursor: input.cursor,
      limit: input.limit,
    });
  }
}
