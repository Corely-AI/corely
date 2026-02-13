import { AppError } from "./app-error";

/**
 * Forbidden error - authenticated but not authorized
 *
 * Use this when user is authenticated but doesn't have permission.
 *
 * @example
 * ```ts
 * throw new ForbiddenError("Insufficient permissions");
 * throw new ForbiddenError("Only workspace admin can perform this action");
 * ```
 */
export class ForbiddenError extends AppError {
  constructor(
    message = "Forbidden",
    code = "Common:Forbidden",
    options?: {
      publicMessage?: string;
      data?: Record<string, unknown>;
      internalDetails?: string;
      cause?: Error;
    }
  ) {
    super({
      code,
      message,
      publicMessage: options?.publicMessage ?? "You don't have permission to perform this action",
      status: 403,
      logLevel: "warn",
      data: options?.data,
      internalDetails: options?.internalDetails,
      cause: options?.cause,
    });
  }
}
