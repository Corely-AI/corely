export interface BackoffConfig {
  baseMs?: number;
  maxMs?: number;
}

export function calculateBackoffDelay(attempt: number, config: BackoffConfig = {}): number {
  const base = config.baseMs ?? 1000;
  const max = config.maxMs ?? 30000;
  const exponential = base * Math.pow(2, attempt);
  const capped = Math.min(exponential, max);
  const jitter = Math.floor(Math.random() * base);
  return capped + jitter;
}
