import { type MessageRepositoryPort } from "../ports/message-repository.port";
import { type GetRunUseCase } from "./get-run.usecase";

export class ListMessagesUseCase {
  constructor(
    private readonly messages: MessageRepositoryPort,
    private readonly getRun: GetRunUseCase
  ) {}

  async execute(params: { tenantId: string; userId: string; runId: string }) {
    await this.getRun.execute(params);
    return this.messages.listByRun(params);
  }
}
