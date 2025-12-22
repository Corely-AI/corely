import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncEngine } from "../sync/syncEngine";
import { InMemoryOutboxStore } from "../testing/inMemoryOutboxStore";
import { InMemoryLock, MemoryLogger, StaticClock, TestNetworkMonitor } from "../testing/fakes";
import { OutboxCommand } from "../outbox/outboxTypes";
import { SyncTransport } from "../sync/syncTransport.port";
import { CommandResult } from "../sync/syncTypes";

const workspaceId = "ws_1";

class StubTransport implements SyncTransport {
  private resolver: (command: OutboxCommand) => CommandResult;

  constructor(resolver: (command: OutboxCommand) => CommandResult) {
    this.resolver = resolver;
  }

  async executeCommand(command: OutboxCommand): Promise<CommandResult> {
    return this.resolver(command);
  }
}

function createCommand(overrides: Partial<OutboxCommand> = {}): OutboxCommand {
  return {
    commandId: `cmd_${Math.random()}`,
    workspaceId,
    type: "TEST",
    payload: { ok: true },
    createdAt: new Date(),
    status: "PENDING",
    attempts: 0,
    idempotencyKey: `idem_${Math.random()}`,
    ...overrides,
  };
}

describe("SyncEngine", () => {
  let store: InMemoryOutboxStore;
  let clock: StaticClock;
  let lock: InMemoryLock;
  let network: TestNetworkMonitor;
  let logger: MemoryLogger;

  beforeEach(() => {
    store = new InMemoryOutboxStore();
    clock = new StaticClock(new Date("2024-01-01T00:00:00.000Z"));
    lock = new InMemoryLock();
    network = new TestNetworkMonitor("ONLINE");
    logger = new MemoryLogger();
  });

  it("flushes pending commands successfully", async () => {
    const transport = new StubTransport(() => ({ status: "OK" }));
    const engine = new SyncEngine(
      {
        store,
        transport,
        lock,
        networkMonitor: network,
        clock,
        idGenerator: { newId: vi.fn() },
        logger,
      },
      { batchSize: 5 }
    );
    engine.trackWorkspace(workspaceId);

    const command = createCommand();
    await store.enqueue(command);

    const stats = await engine.flush(workspaceId);
    expect(stats.succeeded).toBe(1);

    const stored = await store.getById(command.commandId);
    expect(stored?.status).toBe("SUCCEEDED");
  });

  it("retries on retryable errors with backoff", async () => {
    const transport = new StubTransport(() => ({ status: "RETRYABLE_ERROR" }));
    const engine = new SyncEngine(
      {
        store,
        transport,
        lock,
        networkMonitor: network,
        clock,
        idGenerator: { newId: vi.fn() },
        logger,
      },
      { backoff: { baseMs: 1000, maxMs: 2000 } }
    );
    engine.trackWorkspace(workspaceId);

    const command = createCommand();
    await store.enqueue(command);

    const stats = await engine.flush(workspaceId);
    expect(stats.retried).toBe(1);
    const stored = await store.getById(command.commandId);
    expect(stored?.attempts).toBe(1);
    expect(stored?.nextAttemptAt?.getTime()).toBeGreaterThan(clock.now().getTime());
  });

  it("skips flush when lock is not acquired", async () => {
    await lock.acquire(workspaceId);
    const transport = new StubTransport(() => ({ status: "OK" }));
    const engine = new SyncEngine(
      {
        store,
        transport,
        lock,
        networkMonitor: network,
        clock,
        idGenerator: { newId: vi.fn() },
        logger,
      },
      {}
    );
    engine.trackWorkspace(workspaceId);

    await store.enqueue(createCommand());
    const stats = await engine.flush(workspaceId);
    expect(stats.processed).toBe(0);
  });

  it("marks conflicts explicitly", async () => {
    const transport = new StubTransport(() => ({
      status: "CONFLICT",
      conflict: { message: "Version mismatch" },
    }));
    const engine = new SyncEngine(
      {
        store,
        transport,
        lock,
        networkMonitor: network,
        clock,
        idGenerator: { newId: vi.fn() },
        logger,
      },
      {}
    );
    engine.trackWorkspace(workspaceId);

    const command = createCommand();
    await store.enqueue(command);

    const stats = await engine.flush(workspaceId);
    expect(stats.conflicts).toBe(1);
    const stored = await store.getById(command.commandId);
    expect(stored?.status).toBe("CONFLICT");
  });
});
