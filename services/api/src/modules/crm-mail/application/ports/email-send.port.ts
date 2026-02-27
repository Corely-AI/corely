export interface EmailSendPort {
  send(input: {
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
  }): Promise<{ providerMessageId?: string }>;
}

export const CRM_EMAIL_SEND_PORT = "crm-mail/email-send-port";
