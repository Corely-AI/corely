import { describe, expect, it, vi } from "vitest";
import { SearchCopilotMessagesUseCase } from "../application/use-cases/search-copilot-messages.usecase";
import { type ThreadHistoryRepositoryPort } from "../application/ports/thread-history-repository.port";

describe("SearchCopilotMessagesUseCase", () => {
  it("returns scoped search results with snippets", async () => {
    const searchMessages = vi.fn(async () => ({
      items: [
        {
          threadId: "thread-1",
          messageId: "msg-1",
          threadTitle: null,
          contentText: "Need help creating an invoice draft for ACME this month",
          partsJson: "[]",
          createdAt: new Date("2026-02-11T11:00:00.000Z"),
        },
      ],
      nextCursor: null,
    }));

    const repository: ThreadHistoryRepositoryPort = {
      listThreads: vi.fn(),
      getThread: vi.fn(),
      listMessages: vi.fn(),
      searchMessages,
      createThread: vi.fn(),
    };

    const useCase = new SearchCopilotMessagesUseCase(repository);

    const result = await useCase.execute({
      tenantId: "workspace-1",
      userId: "user-1",
      query: "invoice",
    });

    expect(searchMessages).toHaveBeenCalledWith({
      tenantId: "workspace-1",
      userId: "user-1",
      query: "invoice",
      cursor: undefined,
      pageSize: 30,
    });
    expect(result.items[0]).toMatchObject({
      threadId: "thread-1",
      messageId: "msg-1",
      threadTitle: "New chat",
      createdAt: "2026-02-11T11:00:00.000Z",
    });
    expect(result.items[0].snippet.toLowerCase()).toContain("invoice");
  });

  it("returns empty when query is blank", async () => {
    const searchMessages = vi.fn();

    const repository: ThreadHistoryRepositoryPort = {
      listThreads: vi.fn(),
      getThread: vi.fn(),
      listMessages: vi.fn(),
      searchMessages,
      createThread: vi.fn(),
    };

    const useCase = new SearchCopilotMessagesUseCase(repository);

    const result = await useCase.execute({
      tenantId: "workspace-1",
      userId: "user-1",
      query: "   ",
    });

    expect(result).toEqual({ items: [], nextCursor: null });
    expect(searchMessages).not.toHaveBeenCalled();
  });
});
