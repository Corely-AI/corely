import { type SearchCopilotThreadsResponse } from "@corely/contracts";
import { type ThreadHistoryRepositoryPort } from "../ports/thread-history-repository.port";
import {
  buildSearchSnippet,
  normalizeThreadTitle,
  resolveMessageText,
} from "./copilot-thread.utils";

const DEFAULT_PAGE_SIZE = 30;

export class SearchCopilotMessagesUseCase {
  constructor(private readonly threads: ThreadHistoryRepositoryPort) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    query: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<SearchCopilotThreadsResponse> {
    const query = params.query.trim();
    if (!query) {
      return {
        items: [],
        nextCursor: null,
      };
    }

    const result = await this.threads.searchMessages({
      tenantId: params.tenantId,
      userId: params.userId,
      query,
      cursor: params.cursor,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    });

    return {
      items: result.items.map((item) => {
        const text = resolveMessageText({
          contentText: item.contentText,
          partsJson: item.partsJson,
        });
        return {
          threadId: item.threadId,
          messageId: item.messageId,
          threadTitle: normalizeThreadTitle(item.threadTitle),
          snippet: buildSearchSnippet(text, query),
          createdAt: item.createdAt.toISOString(),
        };
      }),
      nextCursor: result.nextCursor,
    };
  }
}
