import { z } from "zod";

/** Diagnostics only; this identifier never grants application access. */
export const FocusedSurfaceSchema = z.enum([
  "app-center",
  "invoice",
  "hr",
  "login",
  "legacy",
  "unknown",
]);
export const FocusedObservationSchema = z
  .object({
    surface: FocusedSurfaceSchema,
    layer: z.enum(["browser", "server"]),
    event: z.enum([
      "preauth",
      "login-start",
      "authorize",
      "login",
      "context",
      "email-code",
      "callback",
      "session",
      "api",
      "app-launch",
      "route-not-found",
      "redirect-loop",
      "legacy-link",
    ]),
    outcome: z.enum([
      "ok",
      "unauthenticated",
      "denied",
      "limited",
      "unavailable",
      "rejected",
      "aborted",
    ]),
    destination: z.enum(["app-center", "invoice", "hr"]).optional(),
    requestId: z.string().uuid().optional(),
  })
  .strict();
export type FocusedObservation = z.infer<typeof FocusedObservationSchema>;
export type FocusedSurface = z.infer<typeof FocusedSurfaceSchema>;

export function focusedRequestEvent(path: string): FocusedObservation["event"] {
  const pathname = (path.split("?")[0] ?? "").replace(/\/+$/, "").toLowerCase();
  if (pathname === "/auth/callback") {
    return "callback";
  }
  if (pathname === "/api/session/preauth") {
    return "preauth";
  }
  if (pathname === "/api/session/login") {
    return "login-start";
  }
  if (pathname === "/sso/authorize") {
    return "authorize";
  }
  if (pathname === "/sso/context") {
    return "context";
  }
  if (pathname === "/sso/login") {
    return "login";
  }
  if (pathname?.startsWith("/sso/email-code/")) {
    return "email-code";
  }
  return pathname?.startsWith("/api/session/") ? "session" : "api";
}
export function focusedOutcome(status: number): FocusedObservation["outcome"] {
  return status === 401
    ? "unauthenticated"
    : status === 403
      ? "denied"
      : status === 429
        ? "limited"
        : status >= 500
          ? "unavailable"
          : status >= 400
            ? "rejected"
            : "ok";
}
