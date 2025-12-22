export type OutboxCommandStatus = "PENDING" | "IN_FLIGHT" | "SUCCEEDED" | "FAILED" | "CONFLICT";

export interface OutboxCommand<TPayload = unknown> {
  commandId: string;
  workspaceId: string;
  type: string;
  payload: TPayload;
  createdAt: Date;
  status: OutboxCommandStatus;
  attempts: number;
  nextAttemptAt?: Date | null;
  idempotencyKey: string;
  clientTraceId?: string;
  meta?: unknown;
  error?: OutboxError;
  conflict?: unknown;
}

export interface OutboxError {
  message: string;
  code?: string;
  retryable?: boolean;
  meta?: unknown;
}
