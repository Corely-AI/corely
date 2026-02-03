import { HttpError } from "@corely/api-client";

export type PublicErrorKind = "disabled" | "not-found";

export type PublicErrorState = {
  kind: PublicErrorKind;
  message?: string;
  code?: string;
};

const resolveProblemDetails = (error: unknown): { code?: string; detail?: string } | null => {
  if (!(error instanceof HttpError)) {
    return null;
  }
  const body = error.body as { code?: string; detail?: string } | undefined;
  return body ?? null;
};

export const resolvePublicError = (error: unknown): PublicErrorState | null => {
  if (!(error instanceof HttpError)) {
    return null;
  }

  const details = resolveProblemDetails(error);
  const code = details?.code;

  if (code === "Public:NotPublished" || code === "Public:WorkspaceNotResolved") {
    return {
      kind: "disabled",
      message: details?.detail ?? "This workspace has not published its public site yet.",
      code,
    };
  }

  if (error.status === 404) {
    return {
      kind: "not-found",
      message: details?.detail,
      code,
    };
  }

  return null;
};
