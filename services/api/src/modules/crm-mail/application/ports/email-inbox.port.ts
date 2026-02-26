import type { EmailSyncResult } from "@corely/integrations-core";

export interface EmailInboxPort {
  syncMailbox(input: {
    mailboxId: string;
    connectionId: string;
    tenantId: string;
    providerKind: string;
    cursor?: string | null;
    limit?: number;
    since?: string;
  }): Promise<EmailSyncResult>;
}

export const CRM_EMAIL_INBOX_PORT = "crm-mail/email-inbox-port";
