import type {
  OutboxCommand,
  OutboxCommandStatus,
  OutboxError,
  OutboxStore,
} from "@corely/offline-core";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type PersistedOutboxCommand = Omit<OutboxCommand, "createdAt" | "nextAttemptAt"> & {
  createdAt: string;
  nextAttemptAt?: string | null;
};

type PersistedSyncState = Record<string, { value: string; updatedAt: string }>;

type PersistedSyncLog = {
  id: string;
  workspaceId: string | null;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  meta?: unknown;
  createdAt: string;
};

const OUTBOX_STORAGE_KEY = "corely-pos.web.outbox.v1";
const SYNC_STATE_STORAGE_KEY = "corely-pos.web.sync-state.v1";
const SYNC_LOG_STORAGE_KEY = "corely-pos.web.sync-logs.v1";
const MAX_SYNC_LOGS = 500;

const memoryStorage = new Map<string, string>();

function createFallbackStorage(): StorageLike {
  return {
    getItem(key) {
      return memoryStorage.get(key) ?? null;
    },
    setItem(key, value) {
      memoryStorage.set(key, value);
    },
    removeItem(key) {
      memoryStorage.delete(key);
    },
  };
}

function getStorage(storage?: StorageLike): StorageLike {
  if (storage) {
    return storage;
  }

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return createFallbackStorage();
  }

  return createFallbackStorage();
}

function sortAscendingByCreatedAt(commands: OutboxCommand[]): OutboxCommand[] {
  return commands
    .slice()
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

function sortDescendingByCreatedAt(commands: OutboxCommand[]): OutboxCommand[] {
  return commands
    .slice()
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

function serializeCommand(command: OutboxCommand): PersistedOutboxCommand {
  return {
    ...command,
    createdAt: command.createdAt.toISOString(),
    nextAttemptAt: command.nextAttemptAt?.toISOString() ?? null,
  };
}

function deserializeCommand(command: PersistedOutboxCommand): OutboxCommand {
  return {
    ...command,
    createdAt: new Date(command.createdAt),
    nextAttemptAt: command.nextAttemptAt ? new Date(command.nextAttemptAt) : null,
  };
}

function stripTransientFields(command: OutboxCommand): OutboxCommand {
  const next: OutboxCommand = {
    commandId: command.commandId,
    workspaceId: command.workspaceId,
    type: command.type,
    payload: command.payload,
    createdAt: command.createdAt,
    status: command.status,
    attempts: command.attempts,
    nextAttemptAt: command.nextAttemptAt ?? null,
    idempotencyKey: command.idempotencyKey,
  };

  if (command.clientTraceId) {
    next.clientTraceId = command.clientTraceId;
  }
  if (command.meta !== undefined) {
    next.meta = command.meta;
  }
  if (command.error) {
    next.error = command.error;
  }
  if (command.conflict !== undefined) {
    next.conflict = command.conflict;
  }

  return next;
}

function readJson<T>(storage: StorageLike, key: string, fallback: T): T {
  const raw = storage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.removeItem(key);
    return fallback;
  }
}

function writeJson(storage: StorageLike, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

function toSyncLogId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export interface PosOutboxStore extends OutboxStore {
  initialize(): Promise<void>;
  findByWorkspace(workspaceId: string, status?: OutboxCommandStatus): Promise<OutboxCommand[]>;
  resetToPending(commandId: string): Promise<void>;
  deleteById?(commandId: string): Promise<void>;
}

export class WebOutboxStore implements PosOutboxStore {
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = getStorage(storage);
  }

  async initialize(): Promise<void> {
    const commands = this.readCommands();
    this.writeCommands(commands);
  }

  async enqueue(command: OutboxCommand): Promise<void> {
    const commands = this.readCommands().filter(
      (existing) => existing.commandId !== command.commandId
    );
    commands.push(command);
    this.writeCommands(commands);
  }

  async listPending(workspaceId: string, limit: number): Promise<OutboxCommand[]> {
    const now = Date.now();
    return sortAscendingByCreatedAt(this.readCommands())
      .filter(
        (command) =>
          command.workspaceId === workspaceId &&
          command.status === "PENDING" &&
          (!command.nextAttemptAt || command.nextAttemptAt.getTime() <= now)
      )
      .slice(0, limit);
  }

  async getById(commandId: string): Promise<OutboxCommand | null> {
    return this.readCommands().find((command) => command.commandId === commandId) ?? null;
  }

  async markInFlight(commandId: string): Promise<void> {
    this.updateCommand(commandId, (command) => ({ ...command, status: "IN_FLIGHT" }));
  }

  async markSucceeded(commandId: string, meta?: unknown): Promise<void> {
    this.updateCommand(commandId, (command) => {
      const { error: _error, conflict: _conflict, ...rest } = command;
      return stripTransientFields({
        ...rest,
        status: "SUCCEEDED",
        meta,
      });
    });
  }

  async markFailed(commandId: string, error: OutboxError): Promise<void> {
    this.updateCommand(commandId, (command) => ({
      ...command,
      status: "FAILED",
      attempts: command.attempts + 1,
      error,
    }));
  }

  async markConflict(commandId: string, info?: unknown): Promise<void> {
    this.updateCommand(commandId, (command) => ({
      ...command,
      status: "CONFLICT",
      conflict: info,
    }));
  }

  async incrementAttempt(commandId: string, nextAttemptAt: Date): Promise<void> {
    this.updateCommand(commandId, (command) => ({
      ...command,
      status: "PENDING",
      attempts: command.attempts + 1,
      nextAttemptAt,
    }));
  }

  async clearWorkspace(workspaceId: string): Promise<void> {
    const next = this.readCommands().filter((command) => command.workspaceId !== workspaceId);
    this.writeCommands(next);
  }

  async findByWorkspace(
    workspaceId: string,
    status?: OutboxCommandStatus
  ): Promise<OutboxCommand[]> {
    return sortDescendingByCreatedAt(this.readCommands()).filter(
      (command) =>
        command.workspaceId === workspaceId && (status ? command.status === status : true)
    );
  }

  async resetToPending(commandId: string): Promise<void> {
    this.updateCommand(commandId, (command) => {
      const { error: _error, conflict: _conflict, ...rest } = command;
      return stripTransientFields({
        ...rest,
        status: "PENDING",
        nextAttemptAt: null,
      });
    });
  }

  async deleteById(commandId: string): Promise<void> {
    const next = this.readCommands().filter((command) => command.commandId !== commandId);
    this.writeCommands(next);
  }

  private readCommands(): OutboxCommand[] {
    const persisted = readJson<PersistedOutboxCommand[]>(this.storage, OUTBOX_STORAGE_KEY, []);
    return persisted.map(deserializeCommand);
  }

  private writeCommands(commands: OutboxCommand[]): void {
    writeJson(
      this.storage,
      OUTBOX_STORAGE_KEY,
      commands.map((command) => serializeCommand(command))
    );
  }

  private updateCommand(
    commandId: string,
    updater: (command: OutboxCommand) => OutboxCommand
  ): void {
    const commands = this.readCommands();
    const index = commands.findIndex((command) => command.commandId === commandId);
    if (index === -1) {
      return;
    }
    commands[index] = updater(commands[index]);
    this.writeCommands(commands);
  }
}

export async function writeSyncStateWeb(
  key: string,
  value: string,
  storage?: StorageLike
): Promise<void> {
  const resolvedStorage = getStorage(storage);
  const state = readJson<PersistedSyncState>(resolvedStorage, SYNC_STATE_STORAGE_KEY, {});
  state[key] = {
    value,
    updatedAt: new Date().toISOString(),
  };
  writeJson(resolvedStorage, SYNC_STATE_STORAGE_KEY, state);
}

export async function appendSyncLogWeb(
  entry: {
    workspaceId: string | null;
    level: "INFO" | "WARN" | "ERROR";
    message: string;
    meta?: unknown;
  },
  storage?: StorageLike
): Promise<void> {
  const resolvedStorage = getStorage(storage);
  const logs = readJson<PersistedSyncLog[]>(resolvedStorage, SYNC_LOG_STORAGE_KEY, []);
  logs.unshift({
    id: toSyncLogId(),
    workspaceId: entry.workspaceId,
    level: entry.level,
    message: entry.message,
    meta: entry.meta,
    createdAt: new Date().toISOString(),
  });
  writeJson(resolvedStorage, SYNC_LOG_STORAGE_KEY, logs.slice(0, MAX_SYNC_LOGS));
}

export async function exportSyncLogsWeb(
  workspaceId: string | null,
  storage?: StorageLike
): Promise<string> {
  const resolvedStorage = getStorage(storage);
  const logs = readJson<PersistedSyncLog[]>(resolvedStorage, SYNC_LOG_STORAGE_KEY, []);
  const filtered = workspaceId ? logs.filter((entry) => entry.workspaceId === workspaceId) : logs;

  return JSON.stringify(
    filtered.map((entry) => ({
      id: entry.id,
      workspaceId: entry.workspaceId,
      level: entry.level,
      message: entry.message,
      meta: entry.meta ?? null,
      createdAt: entry.createdAt,
    })),
    null,
    2
  );
}
