import { OutboxCommand } from "../outbox/outboxTypes";
import { BatchResult, CommandResult } from "./syncTypes";

export interface SyncTransport {
  executeCommand(command: OutboxCommand): Promise<CommandResult>;
  executeBatch?(
    workspaceId: string,
    commands: OutboxCommand[]
  ): Promise<BatchResult | CommandResult[]>;
}
