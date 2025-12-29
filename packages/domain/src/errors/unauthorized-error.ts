import { AppError } from "./app-error";

/**
 * Unauthorized error - authentication required or failed
 *
 * Use this when authentication is required but missing or invalid.
 *
 * @example
 * ```ts
 * throw new UnauthorizedError("Invalid credentials");
 * throw new UnauthorizedError(); // Uses default message
 * ```
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code = "Common:Unauthorized") {
    super({
      code,
      message,
      publicMessage: "Authentication required", // Generic safe message
      status: 401,
      logLevel: "info",
    });
  }
}
