import { AppError } from "./app-error";

/**
 * Resource not found error
 *
 * Use this when a requested resource doesn't exist.
 * The message is NOT exposed to clients by default (sanitized in production).
 *
 * @example
 * ```ts
 * throw new NotFoundError("Invoice not found");
 * throw new NotFoundError("Customer ABC-123 not found", { code: "Customers:NotFound" });
 * ```
 */
export class NotFoundError extends AppError {
  constructor(
    message = "Resource not found",
    options?: {
      code?: string;
      data?: Record<string, unknown>;
      internalDetails?: string;
    }
  ) {
    super({
      code: options?.code ?? "Common:NotFound",
      message,
      // publicMessage NOT set - message contains internal details
      status: 404,
      internalDetails: options?.internalDetails,
      data: options?.data,
      logLevel: "info", // Not found is typically a normal occurrence
    });
  }
}
