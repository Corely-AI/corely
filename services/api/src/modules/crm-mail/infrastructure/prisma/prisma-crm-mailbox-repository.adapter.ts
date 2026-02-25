import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import type { CrmMailboxDto, CrmMailMessageDto, CrmMailThreadDto } from "@corely/contracts";
import type { NormalizedEmailAddress, NormalizedEmailMessage } from "@corely/integrations-core";
import type {
  CrmMailboxRecord,
  CrmMailboxRepositoryPort,
} from "../../application/ports/crm-mailbox-repository.port";

@Injectable()
export class PrismaCrmMailboxRepositoryAdapter implements CrmMailboxRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createMailbox(input: {
    tenantId: string;
    workspaceId: string;
    integrationConnectionId: string;
    providerKind: string;
    address: string;
    displayName?: string | null;
  }): Promise<CrmMailboxDto> {
    const row = await this.prisma.crmMailbox.create({
      data: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        integrationConnectionId: input.integrationConnectionId,
        providerKind: input.providerKind,
        address: input.address,
        displayName: input.displayName ?? null,
      },
    });

    return this.toMailboxDto(row);
  }

  async findMailboxById(tenantId: string, mailboxId: string): Promise<CrmMailboxRecord | null> {
    const row = await this.prisma.crmMailbox.findFirst({
      where: {
        tenantId,
        id: mailboxId,
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      integrationConnectionId: row.integrationConnectionId,
      providerKind: row.providerKind,
      address: row.address,
      displayName: row.displayName,
      syncCursor: row.syncCursor,
    };
  }

  async createOutgoingMessage(input: {
    tenantId: string;
    workspaceId: string;
    mailboxId: string;
    externalMessageId: string;
    subject: string;
    to: Array<{ name?: string | null; email: string }>;
    cc: Array<{ name?: string | null; email: string }>;
    bcc: Array<{ name?: string | null; email: string }>;
  }): Promise<CrmMailMessageDto> {
    const thread = await this.prisma.crmMailThread.upsert({
      where: {
        mailboxId_externalThreadId: {
          mailboxId: input.mailboxId,
          externalThreadId: input.externalMessageId,
        },
      },
      create: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        mailboxId: input.mailboxId,
        externalThreadId: input.externalMessageId,
        subject: input.subject,
        snippet: null,
        lastMessageAt: new Date(),
      },
      update: {
        subject: input.subject,
        lastMessageAt: new Date(),
      },
    });

    const row = await this.prisma.crmMailMessage.upsert({
      where: {
        mailboxId_externalMessageId: {
          mailboxId: input.mailboxId,
          externalMessageId: input.externalMessageId,
        },
      },
      create: {
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        mailboxId: input.mailboxId,
        threadId: thread.id,
        externalMessageId: input.externalMessageId,
        direction: "OUTBOUND",
        subject: input.subject,
        fromJson: this.toNullableJsonInput(null),
        toJson: this.toNullableJsonInput(input.to),
        ccJson: this.toNullableJsonInput(input.cc),
        bccJson: this.toNullableJsonInput(input.bcc),
        snippet: null,
        bodyPreview: null,
      },
      update: {
        subject: input.subject,
        toJson: this.toNullableJsonInput(input.to),
        ccJson: this.toNullableJsonInput(input.cc),
        bccJson: this.toNullableJsonInput(input.bcc),
      },
    });

    return this.toMessageDto(row);
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
    const threadDtos: CrmMailThreadDto[] = [];
    const messageDtos: CrmMailMessageDto[] = [];

    for (const message of input.messages) {
      const externalThreadId = message.threadId ?? message.externalId;
      const thread = await this.prisma.crmMailThread.upsert({
        where: {
          mailboxId_externalThreadId: {
            mailboxId: input.mailboxId,
            externalThreadId,
          },
        },
        create: {
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          mailboxId: input.mailboxId,
          externalThreadId,
          subject: message.subject,
          snippet: message.snippet ?? null,
          lastMessageAt: this.asDate(message.receivedAt ?? message.sentAt),
        },
        update: {
          subject: message.subject,
          snippet: message.snippet ?? null,
          lastMessageAt: this.asDate(message.receivedAt ?? message.sentAt),
        },
      });

      const row = await this.prisma.crmMailMessage.upsert({
        where: {
          mailboxId_externalMessageId: {
            mailboxId: input.mailboxId,
            externalMessageId: message.externalId,
          },
        },
        create: {
          tenantId: input.tenantId,
          workspaceId: input.workspaceId,
          mailboxId: input.mailboxId,
          threadId: thread.id,
          externalMessageId: message.externalId,
          direction: "INBOUND",
          subject: message.subject,
          fromJson: this.toNullableJsonInput(message.from ?? null),
          toJson: this.toNullableJsonInput(message.to),
          ccJson: this.toNullableJsonInput(message.cc),
          bccJson: this.toNullableJsonInput(message.bcc),
          snippet: message.snippet ?? null,
          bodyPreview: message.bodyPreview ?? null,
          sentAt: this.asDate(message.sentAt),
          receivedAt: this.asDate(message.receivedAt),
          rawJson: this.toNullableJsonInput(null),
        },
        update: {
          threadId: thread.id,
          subject: message.subject,
          fromJson: this.toNullableJsonInput(message.from ?? null),
          toJson: this.toNullableJsonInput(message.to),
          ccJson: this.toNullableJsonInput(message.cc),
          bccJson: this.toNullableJsonInput(message.bcc),
          snippet: message.snippet ?? null,
          bodyPreview: message.bodyPreview ?? null,
          sentAt: this.asDate(message.sentAt),
          receivedAt: this.asDate(message.receivedAt),
        },
      });

      threadDtos.push(this.toThreadDto(thread));
      messageDtos.push(this.toMessageDto(row));
    }

    const mailbox = await this.prisma.crmMailbox.update({
      where: {
        id: input.mailboxId,
      },
      data: {
        syncCursor: input.cursor ?? undefined,
      },
    });

    return {
      mailbox: this.toMailboxDto(mailbox),
      threads: threadDtos,
      messages: messageDtos,
    };
  }

  private asDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toNullableJsonInput(value: unknown): Prisma.JsonNullValueInput | Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private toMailboxDto(row: {
    id: string;
    tenantId: string;
    workspaceId: string;
    integrationConnectionId: string;
    providerKind: string;
    address: string;
    displayName: string | null;
    syncCursor: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CrmMailboxDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      integrationConnectionId: row.integrationConnectionId,
      providerKind: this.toProviderKind(row.providerKind),
      address: row.address,
      displayName: row.displayName ?? null,
      syncCursor: row.syncCursor ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toThreadDto(row: {
    id: string;
    mailboxId: string;
    externalThreadId: string;
    subject: string | null;
    snippet: string | null;
    lastMessageAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CrmMailThreadDto {
    return {
      id: row.id,
      mailboxId: row.mailboxId,
      externalThreadId: row.externalThreadId,
      subject: row.subject ?? null,
      snippet: row.snippet ?? null,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toMessageDto(row: {
    id: string;
    mailboxId: string;
    threadId: string;
    externalMessageId: string;
    direction: "INBOUND" | "OUTBOUND";
    subject: string | null;
    fromJson: unknown;
    toJson: unknown;
    ccJson: unknown;
    bccJson: unknown;
    snippet: string | null;
    bodyPreview: string | null;
    sentAt: Date | null;
    receivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): CrmMailMessageDto {
    return {
      id: row.id,
      mailboxId: row.mailboxId,
      threadId: row.threadId,
      externalMessageId: row.externalMessageId,
      direction: row.direction,
      subject: row.subject ?? null,
      from: this.toAddress(row.fromJson),
      to: this.toAddressList(row.toJson),
      cc: this.toAddressList(row.ccJson),
      bcc: this.toAddressList(row.bccJson),
      snippet: row.snippet ?? null,
      bodyPreview: row.bodyPreview ?? null,
      sentAt: row.sentAt?.toISOString() ?? null,
      receivedAt: row.receivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toAddress(value: unknown): { name?: string | null; email: string } | null {
    if (!value || typeof value !== "object") {
      return null;
    }
    const candidate = value as { name?: unknown; email?: unknown };
    if (typeof candidate.email !== "string" || candidate.email.length === 0) {
      return null;
    }

    return {
      name: typeof candidate.name === "string" ? candidate.name : null,
      email: candidate.email,
    };
  }

  private toAddressList(value: unknown): Array<{ name?: string | null; email: string }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.toAddress(item))
      .filter((item): item is { name?: string | null; email: string } => Boolean(item));
  }

  private toProviderKind(
    value: string
  ): "sumup" | "adyen" | "microsoft_graph_mail" | "google_gmail" {
    if (value === "sumup" || value === "adyen" || value === "microsoft_graph_mail") {
      return value;
    }
    return "google_gmail";
  }
}
