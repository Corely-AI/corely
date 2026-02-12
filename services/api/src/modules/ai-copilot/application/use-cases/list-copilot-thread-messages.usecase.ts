import { type ListCopilotThreadMessagesResponse } from "@corely/contracts";
import { type ThreadHistoryRepositoryPort } from "../ports/thread-history-repository.port";
import { parseStoredMessage } from "./copilot-thread.utils";

const DEFAULT_PAGE_SIZE = 200;
const toMessageRole = (role: string): "assistant" | "system" | "tool" | "user" => {
  if (role === "user" || role === "assistant" || role === "system" || role === "tool") {
    return role;
  }
  return "assistant";
};

export class ListCopilotThreadMessagesUseCase {
  constructor(private readonly threads: ThreadHistoryRepositoryPort) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    threadId: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<ListCopilotThreadMessagesResponse> {
    const result = await this.threads.listMessages({
      tenantId: params.tenantId,
      userId: params.userId,
      threadId: params.threadId,
      cursor: params.cursor,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    });

    return {
      items: result.items.map((item) => {
        const parsed = parseStoredMessage(item.partsJson);
        return {
          id: item.id,
          threadId: item.threadId,
          role: toMessageRole(item.role),
          parts: parsed.parts,
          content: parsed.content,
          metadata: parsed.metadata,
          createdAt: item.createdAt.toISOString(),
        };
      }),
      nextCursor: result.nextCursor,
    };
  }
}
