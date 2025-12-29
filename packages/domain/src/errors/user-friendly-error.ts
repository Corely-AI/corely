import { AppError } from "./app-error";

/**
 * User-friendly error - the primary error type for business logic
 *
 * Use this when you want to show a specific, safe message to the end user.
 * The message you provide is automatically exposed as publicMessage and sent to clients.
 *
 * @example
 * ```ts
 * throw new UserFriendlyError("This invoice has already been finalized");
 * throw new UserFriendlyError("Payment amount cannot exceed invoice total", {
 *   code: "Invoices:PaymentExceedsTotal"
 * });
 * ```
 */
export class UserFriendlyError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: string;
      data?: Record<string, unknown>;
      internalDetails?: string;
      cause?: Error;
    }
  ) {
    super({
      code: options?.code ?? "Common:UserFriendly",
      message,
      publicMessage: message, // Message is safe to show
      status: 400,
      internalDetails: options?.internalDetails,
      data: options?.data,
      logLevel: "warn", // User-friendly errors are business logic, not system errors
      cause: options?.cause,
    });
  }
}
