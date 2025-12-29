import { AppError } from "./app-error";

/**
 * External service error - for failures calling external APIs
 *
 * Use this when an external service (payment provider, email service, etc.) fails.
 * Includes a retryable flag to indicate if the operation should be retried.
 *
 * @example
 * ```ts
 * throw new ExternalServiceError("Stripe API timeout", { retryable: true });
 * throw new ExternalServiceError("Invalid API key", { retryable: false, code: "External:Stripe" });
 * ```
 */
export class ExternalServiceError extends AppError {
  readonly retryable: boolean;

  constructor(
    message: string,
    options?: {
      code?: string;
      retryable?: boolean;
      data?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super({
      code: options?.code ?? "Common:ExternalServiceError",
      message,
      publicMessage: "External service temporarily unavailable", // Generic safe message
      status: options?.retryable === false ? 502 : 503, // 503 for retryable, 502 for permanent
      data: options?.data,
      logLevel: "error",
      cause: options?.cause,
    });
    this.retryable = options?.retryable ?? true;
  }
}
