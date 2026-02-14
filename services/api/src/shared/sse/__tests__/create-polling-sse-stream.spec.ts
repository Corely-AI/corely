import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPollingSseStream } from "../create-polling-sse-stream";
import type { TypedSseMessage } from "../sse.types";

describe("createPollingSseStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("emits an initial snapshot and only emits updates when snapshot changes", async () => {
    const snapshots = [{ value: 1 }, { value: 1 }, { value: 2 }];
    let fetchCalls = 0;
    const messages: TypedSseMessage[] = [];

    const stream = createPollingSseStream({
      event: "test.progress",
      intervalMs: 100,
      timeoutMs: 2_000,
      heartbeatMs: 5_000,
      fetchSnapshot: async () => {
        const snapshot = snapshots[Math.min(fetchCalls, snapshots.length - 1)];
        fetchCalls += 1;
        return snapshot;
      },
      isComplete: () => false,
      hash: (snapshot) => String(snapshot.value),
      toEnvelope: (payload) => payload,
    });

    const subscription = stream.subscribe((message) => messages.push(message));
    await vi.advanceTimersByTimeAsync(250);
    subscription.unsubscribe();

    const payloads = messages
      .filter((message) => message.type === "test.progress")
      .map((message) => message.data as { value: number });

    expect(payloads).toEqual([{ value: 1 }, { value: 2 }]);
  });

  it("completes when the completion condition is met", async () => {
    let value = 0;
    const seenValues: number[] = [];
    let completed = false;

    const stream = createPollingSseStream({
      event: "test.progress",
      intervalMs: 100,
      timeoutMs: 2_000,
      heartbeatMs: 5_000,
      fetchSnapshot: async () => ({ value: value++ }),
      isComplete: (snapshot) => snapshot.value >= 2,
      hash: (snapshot) => String(snapshot.value),
      toEnvelope: (payload) => payload,
    });

    stream.subscribe({
      next: (message) => {
        if (message.type === "test.progress") {
          seenValues.push((message.data as { value: number }).value);
        }
      },
      complete: () => {
        completed = true;
      },
    });

    await vi.advanceTimersByTimeAsync(500);

    expect(seenValues).toEqual([0, 1, 2]);
    expect(completed).toBe(true);
  });

  it("emits a timeout event and completes when timeout is reached", async () => {
    const eventTypes: string[] = [];
    let completed = false;

    const stream = createPollingSseStream({
      event: "test.progress",
      intervalMs: 200,
      timeoutMs: 500,
      heartbeatMs: 5_000,
      fetchSnapshot: async () => ({ value: 1 }),
      isComplete: () => false,
      hash: (snapshot) => String(snapshot.value),
      toEnvelope: (payload) => payload,
    });

    stream.subscribe({
      next: (message) => {
        if (message.type) {
          eventTypes.push(message.type);
        }
      },
      complete: () => {
        completed = true;
      },
    });

    await vi.advanceTimersByTimeAsync(1_000);

    expect(eventTypes).toContain("test.progress");
    expect(eventTypes).toContain("timeout");
    expect(completed).toBe(true);
  });
});
