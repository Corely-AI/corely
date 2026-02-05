import { HttpError } from "@corely/api-client";

export type WebsiteErrorState = {
  kind: "not-found";
  message?: string;
  code?: string;
};

export const resolveWebsiteError = (error: unknown): WebsiteErrorState | null => {
  if (!(error instanceof HttpError)) {
    return null;
  }

  if (error.status !== 404) {
    return null;
  }

  const body = error.body as { code?: string; detail?: string } | undefined;
  return {
    kind: "not-found",
    message: body?.detail,
    code: body?.code,
  };
};
