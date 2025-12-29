import { AppError } from "./app-error";

/**
 * Conflict error - for business rule violations and constraint conflicts
 *
 * Use this for duplicate resources, state conflicts, or business rule violations.
 * The message is NOT exposed to clients by default.
 *
 * @example
 * ```ts
 * throw new ConflictError("Invoice already finalized", { code: "Invoices:AlreadyFinalized" });
 * throw new ConflictError("Email already exists", { code: "Users:EmailExists" });
 * ```
 */
export class ConflictError extends AppError {
  constructor(
    message = "Conflict",
    options?: {
      code?: string;
      data?: Record<string, unknown>;
      internalDetails?: string;
    }
  ) {
    super({
      code: options?.code ?? "Common:Conflict",
      message,
      // publicMessage NOT set - use UserFriendlyError if you want to expose the message
      status: 409,
      internalDetails: options?.internalDetails,
      data: options?.data,
      logLevel: "warn",
    });
  }
}
