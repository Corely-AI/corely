import { OutboxCommand } from "../outbox/outboxTypes";

export type SerializedCommand = Omit<OutboxCommand, "createdAt" | "nextAttemptAt"> & {
  createdAt: string;
  nextAttemptAt?: string;
};

export function serializeCommand(command: OutboxCommand): SerializedCommand {
  return {
    ...command,
    createdAt: command.createdAt.toISOString(),
    nextAttemptAt: command.nextAttemptAt?.toISOString(),
  };
}

export function deserializeCommand(serialized: SerializedCommand): OutboxCommand {
  return {
    ...serialized,
    createdAt: new Date(serialized.createdAt),
    nextAttemptAt: serialized.nextAttemptAt ? new Date(serialized.nextAttemptAt) : undefined,
  };
}
