import { describe, expect, it, vi } from "vitest";
import { ListCopilotThreadsUseCase } from "../application/use-cases/list-copilot-threads.usecase";
import { type ThreadHistoryRepositoryPort } from "../application/ports/thread-history-repository.port";

describe("ListCopilotThreadsUseCase", () => {
  it("returns normalized thread summaries for current user scope", async () => {
    const listThreads = vi.fn(async () => ({
      items: [
        {
          id: "thread-1",
          title: null,
          createdAt: new Date("2026-02-11T10:00:00.000Z"),
          updatedAt: new Date("2026-02-11T10:15:00.000Z"),
          lastMessageAt: new Date("2026-02-11T10:14:00.000Z"),
          archivedAt: null,
        },
      ],
      nextCursor: "next-cursor",
    }));

    const repository: ThreadHistoryRepositoryPort = {
      listThreads,
      getThread: vi.fn(),
      listMessages: vi.fn(),
      searchMessages: vi.fn(),
      createThread: vi.fn(),
    };

    const useCase = new ListCopilotThreadsUseCase(repository);

    const result = await useCase.execute({
      tenantId: "workspace-1",
      userId: "user-1",
    });

    expect(listThreads).toHaveBeenCalledWith({
      tenantId: "workspace-1",
      userId: "user-1",
      cursor: undefined,
      pageSize: 30,
      q: undefined,
    });
    expect(result.nextCursor).toBe("next-cursor");
    expect(result.items).toEqual([
      {
        id: "thread-1",
        title: "New chat",
        createdAt: "2026-02-11T10:00:00.000Z",
        updatedAt: "2026-02-11T10:15:00.000Z",
        lastMessageAt: "2026-02-11T10:14:00.000Z",
      },
    ]);
  });
});
