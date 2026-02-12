export interface CopilotThreadRecord {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  archivedAt: Date | null;
}

export interface CopilotThreadMessageRecord {
  id: string;
  threadId: string;
  role: string;
  partsJson: string;
  contentText: string | null;
  createdAt: Date;
}

export interface CopilotThreadSearchRecord {
  threadId: string;
  messageId: string;
  threadTitle: string | null;
  contentText: string | null;
  partsJson: string;
  createdAt: Date;
}

export interface ThreadHistoryRepositoryPort {
  listThreads(params: {
    tenantId: string;
    userId: string;
    cursor?: string;
    pageSize: number;
    q?: string;
  }): Promise<{ items: CopilotThreadRecord[]; nextCursor: string | null }>;

  getThread(params: {
    tenantId: string;
    userId: string;
    threadId: string;
  }): Promise<CopilotThreadRecord | null>;

  listMessages(params: {
    tenantId: string;
    userId: string;
    threadId: string;
    cursor?: string;
    pageSize: number;
  }): Promise<{ items: CopilotThreadMessageRecord[]; nextCursor: string | null }>;

  searchMessages(params: {
    tenantId: string;
    userId: string;
    query: string;
    cursor?: string;
    pageSize: number;
  }): Promise<{ items: CopilotThreadSearchRecord[]; nextCursor: string | null }>;

  createThread(params: {
    id: string;
    tenantId: string;
    userId: string;
    title?: string;
    now: Date;
    traceId?: string;
    metadataJson?: string;
  }): Promise<CopilotThreadRecord>;
}

export const THREAD_HISTORY_REPOSITORY_PORT = "ai-copilot/thread-history-repository";
