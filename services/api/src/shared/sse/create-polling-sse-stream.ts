import { Observable } from "rxjs";
import type { TypedSseMessage, SsePollingStreamOptions } from "./sse.types";

const DEFAULT_INTERVAL_MS = 1_500;
const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_HEARTBEAT_MS = 15_000;
const DEFAULT_HEARTBEAT_EVENT = "heartbeat";
const DEFAULT_TIMEOUT_EVENT = "timeout";

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const defaultHash = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
};

export function createPollingSseStream<TSnapshot, TPayload = TSnapshot>(
  options: SsePollingStreamOptions<TSnapshot, TPayload>
): Observable<TypedSseMessage> {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const heartbeatEvent = options.heartbeatEvent ?? DEFAULT_HEARTBEAT_EVENT;
  const timeoutEvent = options.timeoutEvent ?? DEFAULT_TIMEOUT_EVENT;
  const now = options.now ?? (() => new Date());
  const emitOnChangeOnly = options.emitOnChangeOnly ?? true;
  const toPayload = options.toPayload ?? ((snapshot: TSnapshot) => snapshot as unknown as TPayload);

  return new Observable<TypedSseMessage>((subscriber) => {
    const abortController = new AbortController();
    const startedAt = now();

    let attempt = 0;
    let inFlight = false;
    let closed = false;
    let lastSnapshot: TSnapshot | null = null;
    let hasSnapshot = false;
    let lastHash: string | null = null;

    const emitTimestamp = () => now().toISOString();

    const toMessage = (type: string, data: string | object): TypedSseMessage => ({
      type,
      data,
    });

    const shouldEmit = (snapshot: TSnapshot): boolean => {
      if (!hasSnapshot) {
        return true;
      }
      if (!emitOnChangeOnly) {
        return true;
      }
      if (lastSnapshot === null) {
        return true;
      }
      if (options.equals) {
        return !options.equals(snapshot, lastSnapshot);
      }
      const nextHash = options.hash ? options.hash(snapshot) : defaultHash(snapshot);
      return nextHash !== (lastHash ?? "");
    };

    const updateSnapshotState = (snapshot: TSnapshot) => {
      hasSnapshot = true;
      lastSnapshot = snapshot;
      lastHash = options.hash ? options.hash(snapshot) : defaultHash(snapshot);
    };

    const pollOnce = async () => {
      if (closed || inFlight) {
        return;
      }
      inFlight = true;
      attempt += 1;

      try {
        const snapshot = await options.fetchSnapshot({
          attempt,
          startedAt,
          lastSnapshot,
          signal: abortController.signal,
        });

        if (closed || subscriber.closed) {
          return;
        }

        if (shouldEmit(snapshot)) {
          const payload = toPayload(snapshot);
          const envelope = options.toEnvelope
            ? options.toEnvelope(payload, snapshot)
            : { timestamp: emitTimestamp(), data: payload };
          subscriber.next(toMessage(options.event, envelope));
        }

        updateSnapshotState(snapshot);

        if (options.isComplete(snapshot)) {
          subscriber.complete();
        }
      } catch (error) {
        if (closed || isAbortError(error)) {
          return;
        }
        subscriber.error(error);
      } finally {
        inFlight = false;
      }
    };

    const pollTimer = setInterval(() => {
      void pollOnce();
    }, intervalMs);

    const heartbeatTimer = setInterval(() => {
      if (closed || subscriber.closed) {
        return;
      }
      subscriber.next(toMessage(heartbeatEvent, { timestamp: emitTimestamp() }));
    }, heartbeatMs);

    const timeoutTimer = setTimeout(() => {
      if (closed || subscriber.closed) {
        return;
      }
      subscriber.next(
        toMessage(timeoutEvent, {
          startedAt: startedAt.toISOString(),
          timestamp: emitTimestamp(),
          timeoutMs,
        })
      );
      subscriber.complete();
    }, timeoutMs);

    void pollOnce();

    return () => {
      closed = true;
      abortController.abort();
      clearInterval(pollTimer);
      clearInterval(heartbeatTimer);
      clearTimeout(timeoutTimer);
    };
  });
}
