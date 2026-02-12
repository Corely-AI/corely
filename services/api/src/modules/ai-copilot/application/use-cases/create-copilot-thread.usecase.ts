import { nanoid } from "nanoid";
import { type CreateCopilotThreadResponse } from "@corely/contracts";
import { type ClockPort } from "@corely/kernel";
import { type ThreadHistoryRepositoryPort } from "../ports/thread-history-repository.port";
import { createThreadTitleFromText, normalizeThreadTitle } from "./copilot-thread.utils";

export class CreateCopilotThreadUseCase {
  constructor(
    private readonly threads: ThreadHistoryRepositoryPort,
    private readonly clock: ClockPort
  ) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    title?: string;
    traceId?: string;
    metadataJson?: string;
  }): Promise<CreateCopilotThreadResponse> {
    const now = this.clock.now();
    const created = await this.threads.createThread({
      id: nanoid(),
      tenantId: params.tenantId,
      userId: params.userId,
      title: params.title ? createThreadTitleFromText(params.title) : undefined,
      now,
      traceId: params.traceId,
      metadataJson: params.metadataJson,
    });

    return {
      thread: {
        id: created.id,
        title: normalizeThreadTitle(created.title),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        lastMessageAt: created.lastMessageAt.toISOString(),
        archivedAt: created.archivedAt ? created.archivedAt.toISOString() : null,
      },
    };
  }
}
