import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import {
  type ChatStorePort,
  type CopilotChatMetadata,
} from "../../application/ports/chat-store.port";
import { type CopilotUIMessage } from "../../domain/types/ui-message";

const serializeMessage = (message: CopilotUIMessage) =>
  JSON.stringify({
    parts: message.parts ?? [],
    metadata: message.metadata,
  });

const extractTextFromMessage = (message: CopilotUIMessage): string => {
  const fromParts =
    message.parts
      ?.map((part) => {
        if (part.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join(" ") ?? "";

  return fromParts.replace(/\s+/g, " ").trim();
};

const toThreadTitle = (value: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New chat";
  }
  return normalized.length > 80 ? `${normalized.slice(0, 79).trimEnd()}…` : normalized;
};

const parseMessage = (row: { id: string; role: string; partsJson: string }): CopilotUIMessage => {
  try {
    const parsed = JSON.parse(row.partsJson);
    const parts = Array.isArray(parsed?.parts) ? parsed.parts : Array.isArray(parsed) ? parsed : [];
    return {
      id: row.id,
      role: row.role as CopilotUIMessage["role"],
      parts,
      metadata: parsed?.metadata,
    };
  } catch {
    return {
      id: row.id,
      role: row.role as CopilotUIMessage["role"],
      parts: [],
    };
  }
};

const mergeMetadata = (
  current: CopilotChatMetadata | undefined,
  incoming: CopilotChatMetadata | undefined
): CopilotChatMetadata | undefined => {
  if (!current && !incoming) {
    return undefined;
  }
  return {
    ...current,
    ...incoming,
    taskState: incoming?.taskState ?? current?.taskState,
  };
};

@Injectable()
export class PrismaChatStoreAdapter implements ChatStorePort {
  constructor(private readonly prisma: PrismaService) {}

  async load(params: {
    chatId: string;
    tenantId: string;
  }): Promise<{ messages: CopilotUIMessage[]; metadata?: CopilotChatMetadata }> {
    const [run, rows] = await Promise.all([
      this.prisma.agentRun.findFirst({
        where: { id: params.chatId, tenantId: params.tenantId },
        select: { metadataJson: true },
      }),
      this.prisma.message.findMany({
        where: { runId: params.chatId, tenantId: params.tenantId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    let metadata: CopilotChatMetadata | undefined;
    if (run?.metadataJson) {
      try {
        metadata = JSON.parse(run.metadataJson) as CopilotChatMetadata;
      } catch {
        metadata = undefined;
      }
    }

    return { messages: rows.map((row) => parseMessage(row)), metadata };
  }

  async save(params: {
    chatId: string;
    tenantId: string;
    messages: CopilotUIMessage[];
    metadata?: CopilotChatMetadata;
    traceId?: string;
  }): Promise<void> {
    if (!params.messages.length && !params.metadata) {
      return;
    }

    const run = await this.prisma.agentRun.findFirst({
      where: { id: params.chatId, tenantId: params.tenantId },
      select: { metadataJson: true, title: true },
    });
    const nextMetadata = mergeMetadata(
      run?.metadataJson ? (JSON.parse(run.metadataJson) as CopilotChatMetadata) : undefined,
      params.metadata
    );
    const firstUserText = params.messages.find((message) => message.role === "user");
    const inferredTitle = firstUserText
      ? toThreadTitle(extractTextFromMessage(firstUserText))
      : null;
    const now = new Date();
    if (!run) {
      try {
        await this.prisma.agentRun.create({
          data: {
            id: params.chatId,
            tenantId: params.tenantId,
            createdByUserId: params.metadata?.userId,
            title: inferredTitle || undefined,
            status: "running",
            metadataJson: nextMetadata ? JSON.stringify(nextMetadata) : undefined,
            lastMessageAt: now,
            traceId: params.traceId,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Run was created concurrently; fall through to metadata update.
        } else {
          throw error;
        }
      }
    }
    if (params.metadata || inferredTitle) {
      await this.prisma.agentRun.update({
        where: { id: params.chatId },
        data: {
          metadataJson: nextMetadata ? JSON.stringify(nextMetadata) : null,
          title: run?.title ?? inferredTitle ?? undefined,
          lastMessageAt: now,
        },
      });
    } else if (params.messages.length) {
      await this.prisma.agentRun.update({
        where: { id: params.chatId },
        data: {
          lastMessageAt: now,
        },
      });
    }

    for (const message of params.messages) {
      if (!message.id) {
        continue;
      }
      const payload = serializeMessage(message);
      const contentText = extractTextFromMessage(message) || undefined;
      const existing = await this.prisma.message.findUnique({
        where: { id: message.id },
        select: { tenantId: true },
      });

      if (!existing) {
        try {
          await this.prisma.message.create({
            data: {
              id: message.id,
              tenantId: params.tenantId,
              runId: params.chatId,
              role: message.role ?? "assistant",
              partsJson: payload,
              contentText,
              traceId: params.traceId,
            },
          });
          continue;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const concurrent = await this.prisma.message.findUnique({
              where: { id: message.id },
              select: { tenantId: true },
            });
            if (!concurrent) {
              throw error;
            }
            if (concurrent.tenantId !== params.tenantId) {
              throw new Error("Message tenant mismatch");
            }
            await this.prisma.message.update({
              where: { id: message.id },
              data: {
                partsJson: payload,
                role: message.role ?? "assistant",
                contentText,
                traceId: params.traceId,
              },
            });
            continue;
          }
          throw error;
        }
      }

      if (existing.tenantId !== params.tenantId) {
        throw new Error("Message tenant mismatch");
      }

      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          partsJson: payload,
          role: message.role ?? "assistant",
          contentText,
          traceId: params.traceId,
        },
      });
    }
  }
}
