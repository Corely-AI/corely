export type PollAsyncJobStatus = "TERMINAL" | "TIMEOUT" | "ABORTED";

export type PollAsyncJobResult<TResponse> = {
  status: PollAsyncJobStatus;
  response?: TResponse;
};

export type PollAsyncJobOptions<TResponse extends { retryAfterMs?: number }> = {
  request: (params: {
    waitMs: number;
    signal: AbortSignal;
    attempt: number;
    elapsedMs: number;
  }) => Promise<TResponse>;
  isTerminal: (response: TResponse) => boolean;
  maxTotalWaitMs: number;
  perRequestWaitMs: number;
  minRetryAfterMs: number;
  maxRetryAfterMs: number;
  signal?: AbortSignal;
  onResponse?: (response: TResponse, meta: { attempt: number; elapsedMs: number }) => void;
};

export async function pollAsyncJob<TResponse extends { retryAfterMs?: number }>(
  options: PollAsyncJobOptions<TResponse>
): Promise<PollAsyncJobResult<TResponse>> {
  const controller = new AbortController();
  const signal = controller.signal;
  const externalSignal = options.signal;

  if (externalSignal?.aborted) {
    return { status: "ABORTED" };
  }

  const onAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onAbort, { once: true });

  try {
    const startedAt = Date.now();
    let attempt = 0;
    let lastResponse: TResponse | undefined;

    while (Date.now() - startedAt < options.maxTotalWaitMs) {
      if (signal.aborted) {
        return { status: "ABORTED", response: lastResponse };
      }

      attempt += 1;
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = options.maxTotalWaitMs - elapsedMs;
      const waitMs = Math.max(0, Math.min(options.perRequestWaitMs, remainingMs));

      const response = await options.request({
        waitMs,
        signal,
        attempt,
        elapsedMs,
      });
      lastResponse = response;
      options.onResponse?.(response, { attempt, elapsedMs });

      if (options.isTerminal(response)) {
        return { status: "TERMINAL", response };
      }

      const retryAfterMs = clampRetryAfter(
        response.retryAfterMs,
        options.minRetryAfterMs,
        options.maxRetryAfterMs
      );

      await waitWithAbort(retryAfterMs, signal);
    }

    return { status: "TIMEOUT", response: lastResponse };
  } finally {
    externalSignal?.removeEventListener("abort", onAbort);
  }
}

function clampRetryAfter(value: number | undefined, minMs: number, maxMs: number): number {
  const fallback = minMs;
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minMs, Math.min(maxMs, Math.floor(value as number)));
}

function waitWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
