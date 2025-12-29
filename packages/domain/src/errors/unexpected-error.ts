import { AppError } from "./app-error";

/**
 * Unexpected error - for truly unexpected system errors
 *
 * Use this as a last resort for errors that shouldn't happen in normal operation.
 * The message is NOT exposed to clients - they see a generic error message.
 *
 * In most cases, you should use a more specific error type or UserFriendlyError.
 *
 * @example
 * ```ts
 * throw new UnexpectedError("Unexpected null value in critical field");
 * ```
 */
export class UnexpectedError extends AppError {
  constructor(
    message: string,
    options?: {
      data?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super({
      code: "Common:UnexpectedError",
      message,
      // publicMessage NOT set - never expose internal error details
      status: 500,
      data: options?.data,
      logLevel: "error",
      cause: options?.cause,
    });
  }
}
