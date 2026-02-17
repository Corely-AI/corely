import type { MessageEvent } from "@nestjs/common";

export type SseEventEnvelope<TPayload> = {
  timestamp: string;
  data: TPayload;
};

export type SsePollingContext<TSnapshot> = {
  attempt: number;
  startedAt: Date;
  lastSnapshot: TSnapshot | null;
  signal: AbortSignal;
};

export type SsePollingStreamOptions<TSnapshot, TPayload = TSnapshot> = {
  event: string;
  fetchSnapshot: (context: SsePollingContext<TSnapshot>) => Promise<TSnapshot>;
  isComplete: (snapshot: TSnapshot) => boolean;
  intervalMs?: number;
  timeoutMs?: number;
  heartbeatMs?: number;
  heartbeatEvent?: string;
  timeoutEvent?: string;
  emitOnChangeOnly?: boolean;
  toPayload?: (snapshot: TSnapshot) => TPayload;
  toEnvelope?: (payload: TPayload, snapshot: TSnapshot) => string | object;
  equals?: (next: TSnapshot, previous: TSnapshot) => boolean;
  hash?: (snapshot: TSnapshot) => string;
  now?: () => Date;
};

export type TypedSseMessage<TData extends string | object = string | object> = MessageEvent & {
  data: TData;
  type?: string;
};
