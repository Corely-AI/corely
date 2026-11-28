import { Catch, HttpException, type ExceptionFilter, type ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class SsoExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : 503;
    const message =
      status === 429
        ? "Too many attempts. Wait five minutes and try again."
        : status >= 500
          ? "Sign-in is temporarily unavailable. Please try again shortly."
          : status === 401
            ? "Unable to sign in. Check your credentials and team access, or restart sign-in."
            : status === 409
              ? "A sign-in is already active. Continue with it or sign out before changing accounts."
              : "This sign-in request expired, was cancelled or could not be verified. Return to your app and start again.";
    res.set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
    });
    if (status === 429) {
      res.set("Retry-After", "300");
    }
    if (req.accepts(["html", "json"]) === "json") {
      res.status(status).json({ message });
    } else {
      res.set(
        "Content-Security-Policy",
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"
      );
      res
        .status(status)
        .type("html")
        .send(
          `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Corely sign-in</title><body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:24px"><h1>Sign-in needs attention</h1><p role="alert">${message}</p><p>Your data has not been changed.</p></body></html>`
        );
    }
  }
}
