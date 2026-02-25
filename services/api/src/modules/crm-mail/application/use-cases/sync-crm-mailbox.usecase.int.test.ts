import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOk, type UseCaseContext } from "@corely/kernel";
import type { CrmMailboxDto, CrmMailMessageDto, CrmMailThreadDto } from "@corely/contracts";
import type { NormalizedEmailMessage } from "@corely/integrations-core";
import { IntegrationConnectionEntity } from "../../../integrations/domain/integration-connection.entity";
import { IntegrationProviderRegistryService } from "../../../integrations/application/services/integration-provider-registry.service";
import { IntegrationConnectionResolverService } from "../../../integrations/application/services/integration-connection-resolver.service";
import { IntegrationsEmailProviderService } from "../../../integrations/infrastructure/providers/integrations-email-provider.service";
import { IntegrationsEmailAdapter } from "../../infrastructure/adapters/integrations-email.adapter";
import type {
  CrmMailboxRecord,
  CrmMailboxRepositoryPort,
} from "../ports/crm-mailbox-repository.port";
import { SyncCrmMailboxUseCase } from "./sync-crm-mailbox.usecase";

class InMemoryCrmMailboxRepository implements CrmMailboxRepositoryPort {
  public syncedMessages: NormalizedEmailMessage[] = [];
  public syncedCursor: string | null = null;

  private readonly mailbox: CrmMailboxRecord = {
    id: "mailbox-1",
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    integrationConnectionId: "connection-1",
    providerKind: "google_gmail",
    address: "sales@example.com",
    displayName: "Sales",
    syncCursor: null,
  };

  async createMailbox(_input: {
    tenantId: string;
    workspaceId: string;
    integrationConnectionId: string;
    providerKind: string;
    address: string;
    displayName?: string | null;
  }): Promise<CrmMailboxDto> {
    throw new Error("Not implemented for this test");
  }

  async findMailboxById(tenantId: string, mailboxId: string): Promise<CrmMailboxRecord | null> {
    if (tenantId !== this.mailbox.tenantId || mailboxId !== this.mailbox.id) {
      return null;
    }
    return this.mailbox;
  }

  async createOutgoingMessage(_input: {
    tenantId: string;
    workspaceId: string;
    mailboxId: string;
    externalMessageId: string;
    subject: string;
    to: Array<{ name?: string | null; email: string }>;
    cc: Array<{ name?: string | null; email: string }>;
    bcc: Array<{ name?: string | null; email: string }>;
  }): Promise<CrmMailMessageDto> {
    throw new Error("Not implemented for this test");
  }

  async upsertSyncedMessages(input: {
    tenantId: string;
    workspaceId: string;
    mailboxId: string;
    messages: NormalizedEmailMessage[];
    cursor?: string | null;
  }): Promise<{
    mailbox: CrmMailboxDto;
    threads: CrmMailThreadDto[];
    messages: CrmMailMessageDto[];
  }> {
    this.syncedMessages = input.messages;
    this.syncedCursor = input.cursor ?? null;

    const nowIso = new Date("2026-02-01T00:00:00.000Z").toISOString();
    return {
      mailbox: {
        id: input.mailboxId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        integrationConnectionId: this.mailbox.integrationConnectionId,
        providerKind: "google_gmail",
        address: this.mailbox.address,
        displayName: this.mailbox.displayName ?? null,
        syncCursor: this.syncedCursor,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      threads: input.messages.map((message, index) => ({
        id: `thread-${index + 1}`,
        mailboxId: input.mailboxId,
        externalThreadId: message.threadId ?? message.externalId,
        subject: message.subject,
        snippet: message.snippet ?? null,
        lastMessageAt: message.receivedAt ?? message.sentAt ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      })),
      messages: input.messages.map((message, index) => ({
        id: `message-${index + 1}`,
        mailboxId: input.mailboxId,
        threadId: `thread-${index + 1}`,
        externalMessageId: message.externalId,
        direction: "INBOUND",
        subject: message.subject,
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        snippet: message.snippet ?? null,
        bodyPreview: message.bodyPreview ?? null,
        sentAt: message.sentAt,
        receivedAt: message.receivedAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      })),
    };
  }
}

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  requestId: "req-1",
  correlationId: "corr-1",
};

describe("SyncCrmMailboxUseCase (integration)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it("syncs Gmail inbox messages and persists normalized output", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            messages: [{ id: "gmail-msg-1", threadId: "gmail-thread-1" }],
            nextPageToken: "gmail-cursor-2",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "gmail-msg-1",
            threadId: "gmail-thread-1",
            snippet: "Hello from customer",
            internalDate: "1735689600000",
            payload: {
              headers: [
                { name: "From", value: "Alice <alice@example.com>" },
                { name: "To", value: "Sales Team <sales@example.com>" },
                { name: "Subject", value: "Need a quote" },
                { name: "Date", value: "Wed, 01 Jan 2025 00:00:00 +0000" },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

    const repository = new InMemoryCrmMailboxRepository();
    const connection = new IntegrationConnectionEntity({
      id: "connection-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      kind: "google_gmail",
      authMethod: "oauth2",
      status: "active",
      displayName: "Gmail",
      config: {},
      secretEncrypted: "encrypted",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const resolver = {
      resolveById: vi.fn().mockResolvedValue({
        connection,
        secret: JSON.stringify({ accessToken: "google-access-token-1" }),
      }),
    } as unknown as IntegrationConnectionResolverService;
    const providerRegistry = new IntegrationProviderRegistryService();
    const providerService = new IntegrationsEmailProviderService(resolver, providerRegistry);
    const inboxPort = new IntegrationsEmailAdapter(providerService);
    const useCase = new SyncCrmMailboxUseCase(repository, inboxPort);

    const result = await useCase.execute(
      {
        mailboxId: "mailbox-1",
        limit: 10,
      },
      ctx
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) {
      throw new Error("Expected successful sync result");
    }

    expect(repository.syncedMessages).toHaveLength(1);
    expect(repository.syncedMessages[0].externalId).toBe("gmail-msg-1");
    expect(repository.syncedMessages[0].threadId).toBe("gmail-thread-1");
    expect(repository.syncedMessages[0].subject).toBe("Need a quote");
    expect(repository.syncedMessages[0].from?.email).toBe("alice@example.com");
    expect(repository.syncedCursor).toBe("gmail-cursor-2");
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });
});
