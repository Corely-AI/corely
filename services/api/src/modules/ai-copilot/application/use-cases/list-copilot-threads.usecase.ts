import { type ListCopilotThreadsResponse } from "@corely/contracts";
import { type ThreadHistoryRepositoryPort } from "../ports/thread-history-repository.port";
import { normalizeThreadTitle } from "./copilot-thread.utils";

const DEFAULT_PAGE_SIZE = 30;

export class ListCopilotThreadsUseCase {
  constructor(private readonly threads: ThreadHistoryRepositoryPort) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    cursor?: string;
    pageSize?: number;
    q?: string;
  }): Promise<ListCopilotThreadsResponse> {
    const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
    const result = await this.threads.listThreads({
      tenantId: params.tenantId,
      userId: params.userId,
      cursor: params.cursor,
      pageSize,
      q: params.q,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: normalizeThreadTitle(item.title),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        lastMessageAt: item.lastMessageAt.toISOString(),
      })),
      nextCursor: result.nextCursor,
    };
  }
}
