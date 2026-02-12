import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import {
  type CopilotThreadRecord,
  type CopilotThreadMessageRecord,
  type CopilotThreadSearchRecord,
  type ThreadHistoryRepositoryPort,
} from "../../application/ports/thread-history-repository.port";

interface ThreadCursorPayload {
  id: string;
  lastMessageAt: string;
}

interface MessageCursorPayload {
  id: string;
  createdAt: string;
}

const decodeCursor = <T>(cursor: string | undefined): T | undefined => {
  if (!cursor) {
    return undefined;
  }
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
};

const encodeCursor = (payload: object): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

@Injectable()
export class PrismaThreadHistoryRepository implements ThreadHistoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listThreads(params: {
    tenantId: string;
    userId: string;
    cursor?: string;
    pageSize: number;
    q?: string;
  }): Promise<{ items: CopilotThreadRecord[]; nextCursor: string | null }> {
    const cursor = decodeCursor<ThreadCursorPayload>(params.cursor);

    const where: Prisma.AgentRunWhereInput = {
      tenantId: params.tenantId,
      createdByUserId: params.userId,
      archivedAt: null,
    };

    if (params.q) {
      where.title = {
        contains: params.q,
        mode: "insensitive",
      };
    }

    if (cursor) {
      const cursorDate = new Date(cursor.lastMessageAt);
      where.AND = [
        {
          OR: [
            {
              lastMessageAt: {
                lt: cursorDate,
              },
            },
            {
              lastMessageAt: cursorDate,
              id: {
                lt: cursor.id,
              },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.agentRun.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: params.pageSize + 1,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        archivedAt: true,
      },
    });

    const hasMore = rows.length > params.pageSize;
    const items = rows.slice(0, params.pageSize).map(this.mapThreadRecord);

    return {
      items,
      nextCursor:
        hasMore && items.length
          ? encodeCursor({
              id: items[items.length - 1].id,
              lastMessageAt: items[items.length - 1].lastMessageAt.toISOString(),
            })
          : null,
    };
  }

  async getThread(params: {
    tenantId: string;
    userId: string;
    threadId: string;
  }): Promise<CopilotThreadRecord | null> {
    const row = await this.prisma.agentRun.findFirst({
      where: {
        id: params.threadId,
        tenantId: params.tenantId,
        createdByUserId: params.userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        archivedAt: true,
      },
    });

    return row ? this.mapThreadRecord(row) : null;
  }

  async listMessages(params: {
    tenantId: string;
    userId: string;
    threadId: string;
    cursor?: string;
    pageSize: number;
  }): Promise<{ items: CopilotThreadMessageRecord[]; nextCursor: string | null }> {
    const cursor = decodeCursor<MessageCursorPayload>(params.cursor);

    const where: Prisma.MessageWhereInput = {
      tenantId: params.tenantId,
      runId: params.threadId,
      run: {
        createdByUserId: params.userId,
      },
    };

    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      where.AND = [
        {
          OR: [
            {
              createdAt: {
                gt: cursorDate,
              },
            },
            {
              createdAt: cursorDate,
              id: {
                gt: cursor.id,
              },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.pageSize + 1,
      select: {
        id: true,
        runId: true,
        role: true,
        partsJson: true,
        contentText: true,
        createdAt: true,
      },
    });

    const hasMore = rows.length > params.pageSize;
    const items = rows.slice(0, params.pageSize).map((row) => ({
      id: row.id,
      threadId: row.runId,
      role: row.role,
      partsJson: row.partsJson,
      contentText: row.contentText,
      createdAt: row.createdAt,
    }));

    return {
      items,
      nextCursor:
        hasMore && items.length
          ? encodeCursor({
              id: items[items.length - 1].id,
              createdAt: items[items.length - 1].createdAt.toISOString(),
            })
          : null,
    };
  }

  async searchMessages(params: {
    tenantId: string;
    userId: string;
    query: string;
    cursor?: string;
    pageSize: number;
  }): Promise<{ items: CopilotThreadSearchRecord[]; nextCursor: string | null }> {
    const cursor = decodeCursor<MessageCursorPayload>(params.cursor);

    const where: Prisma.MessageWhereInput = {
      tenantId: params.tenantId,
      run: {
        createdByUserId: params.userId,
        archivedAt: null,
      },
      OR: [
        {
          contentText: {
            contains: params.query,
            mode: "insensitive",
          },
        },
        {
          partsJson: {
            contains: params.query,
            mode: "insensitive",
          },
        },
      ],
    };

    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      where.AND = [
        {
          OR: [
            {
              createdAt: {
                lt: cursorDate,
              },
            },
            {
              createdAt: cursorDate,
              id: {
                lt: cursor.id,
              },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.pageSize + 1,
      select: {
        id: true,
        runId: true,
        contentText: true,
        partsJson: true,
        createdAt: true,
        run: {
          select: {
            title: true,
          },
        },
      },
    });

    const hasMore = rows.length > params.pageSize;
    const items = rows.slice(0, params.pageSize).map((row) => ({
      threadId: row.runId,
      messageId: row.id,
      threadTitle: row.run.title,
      contentText: row.contentText,
      partsJson: row.partsJson,
      createdAt: row.createdAt,
    }));

    return {
      items,
      nextCursor:
        hasMore && items.length
          ? encodeCursor({
              id: items[items.length - 1].messageId,
              createdAt: items[items.length - 1].createdAt.toISOString(),
            })
          : null,
    };
  }

  async createThread(params: {
    id: string;
    tenantId: string;
    userId: string;
    title?: string;
    now: Date;
    traceId?: string;
    metadataJson?: string;
  }): Promise<CopilotThreadRecord> {
    const created = await this.prisma.agentRun.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        createdByUserId: params.userId,
        title: params.title,
        status: "running",
        startedAt: params.now,
        lastMessageAt: params.now,
        metadataJson: params.metadataJson,
        traceId: params.traceId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
        archivedAt: true,
      },
    });

    return this.mapThreadRecord(created);
  }

  private mapThreadRecord(row: {
    id: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date;
    archivedAt: Date | null;
  }): CopilotThreadRecord {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastMessageAt: row.lastMessageAt,
      archivedAt: row.archivedAt,
    };
  }
}
