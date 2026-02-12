import { NotFoundException } from "@nestjs/common";
import { type GetCopilotThreadResponse } from "@corely/contracts";
import { type ThreadHistoryRepositoryPort } from "../ports/thread-history-repository.port";
import { normalizeThreadTitle } from "./copilot-thread.utils";

export class GetCopilotThreadUseCase {
  constructor(private readonly threads: ThreadHistoryRepositoryPort) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    threadId: string;
  }): Promise<GetCopilotThreadResponse> {
    const thread = await this.threads.getThread(params);
    if (!thread) {
      throw new NotFoundException("Thread not found");
    }

    return {
      thread: {
        id: thread.id,
        title: normalizeThreadTitle(thread.title),
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        lastMessageAt: thread.lastMessageAt.toISOString(),
        archivedAt: thread.archivedAt ? thread.archivedAt.toISOString() : null,
      },
    };
  }
}
