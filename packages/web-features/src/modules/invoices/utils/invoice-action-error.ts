import { normalizeError } from "@corely/api-client";
import { SessionRequestError } from "@corely/web-shared/session/session-client";

export function invoiceActionError(error: unknown, fallback: string): string {
  if (error instanceof SessionRequestError) {
    return fallback;
  }
  const problem = normalizeError(error);
  return [400, 409, 422].includes(problem.status) ? problem.detail : fallback;
}
