import type { CrmMailboxDto, CrmMailMessageDto, CrmMailThreadDto } from "@corely/contracts";
import type { NormalizedEmailMessage } from "@corely/integrations-core";

export interface CrmMailboxRecord {
  id: string;
  tenantId: string;
  workspaceId: string;
  integrationConnectionId: string;
  providerKind: string;
  address: string;
  displayName?: string | null;
  syncCursor?: string | null;
}

export interface CrmMailboxRepositoryPort {
  createMailbox(input: {
    tenantId: string;
    workspaceId: string;
    integrationConnectionId: string;
    providerKind: string;
    address: string;
    displayName?: string | null;
  }): Promise<CrmMailboxDto>;

  findMailboxById(tenantId: string, mailboxId: string): Promise<CrmMailboxRecord | null>;

  createOutgoingMessage(input: {
    tenantId: string;
    workspaceId: string;
    mailboxId: string;
    externalMessageId: string;
    subject: string;
    to: Array<{ name?: string | null; email: string }>;
    cc: Array<{ name?: string | null; email: string }>;
    bcc: Array<{ name?: string | null; email: string }>;
  }): Promise<CrmMailMessageDto>;

  upsertSyncedMessages(input: {
    tenantId: string;
    workspaceId: string;
    mailboxId: string;
    messages: NormalizedEmailMessage[];
    cursor?: string | null;
  }): Promise<{
    mailbox: CrmMailboxDto;
    threads: CrmMailThreadDto[];
    messages: CrmMailMessageDto[];
  }>;
}

export const CRM_MAILBOX_REPOSITORY_PORT = "crm-mail/mailbox-repository";
