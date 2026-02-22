import { HttpError } from "@corely/api-client";

export type WebsiteErrorState = {
  kind: "not-found" | "unavailable";
  message?: string;
  code?: string;
  status?: number | null;
};

export const resolveWebsiteError = (error: unknown): WebsiteErrorState | null => {
  if (!(error instanceof HttpError)) {
    return null;
  }

  const body = error.body as
    | { code?: string; detail?: string; error?: string; message?: string }
    | undefined;
  const code = body?.code ?? body?.error;
  const message = body?.detail ?? body?.message;

  if (error.status === 404) {
    return {
      kind: "not-found",
      message,
      code,
      status: error.status,
    };
  }

  if (error.status && error.status >= 500) {
    return {
      kind: "unavailable",
      message,
      code,
      status: error.status,
    };
  }

  return null;
};
