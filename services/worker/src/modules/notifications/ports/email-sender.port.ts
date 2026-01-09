export type EmailAttachment = {
  filename: string;
  path?: string;
  content?: Buffer;
  mimeType?: string;
};

export type SendEmailRequest = {
  tenantId: string;
  to: string[];
  cc?: string[] | undefined;
  bcc?: string[] | undefined;
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string | undefined;
  headers?: Record<string, string>;
  idempotencyKey?: string | undefined;
};

export type SendEmailResponse = {
  provider: string;
  providerMessageId: string;
};

export interface EmailSenderPort {
  sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
}

export const EMAIL_SENDER_PORT = "worker/notifications/email-sender";
