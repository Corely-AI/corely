import {
  BadRequestException,
  HttpException,
  type INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { json, urlencoded, type Request, type Response, type NextFunction } from "express";
import { SsoSessionService } from "../../application/services/sso-session.service";
import { SsoHttpSecurity, SSO_COOKIES } from "./sso-http-security";
import { setSsoSessionPrincipal } from "./sso-session-principal";
import type { SsoAppKey } from "@corely/contracts";

const shared = ["documents", "workspaces", "menu", "platform/apps", "copilot", "ai-copilot"];
const routes: Record<SsoAppKey, readonly string[]> = {
  "app-center": [...shared, "invoices", "customers", "people", "tasks"],
  invoice: [...shared, "invoices", "customers"],
  hr: [...shared, "people", "tasks"],
};
export function bffTarget(path: string, app: SsoAppKey): string | undefined {
  // No URL fetch, encoded separators, workspace rewrite aliases or dot normalization.
  if (!path.startsWith("/api/bff/") || /[%\\]|\/\/|(?:^|\/)\.{1,2}(?:\/|$)|\/w\//.test(path)) {
    return;
  }
  const target = path.slice("/api/bff".length);
  if (/^\/invoices\/public(?:\/|$)/i.test(target)) {
    return;
  }
  return routes[app].some((root) => target === `/${root}` || target.startsWith(`/${root}/`))
    ? target
    : undefined;
}
function hint(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new UnauthorizedException("Invalid context hint");
  }
  return value;
}

function bodyErrorStatus(error: unknown): number {
  return typeof error === "object" && error !== null && "status" in error && error.status === 413
    ? 413
    : 400;
}

/** Install before SSO CORS, legacy parsers, public URL rewriting and Nest routing. */
export function configureSsoSessionTransport(app: INestApplication): void {
  const sessions = app.get(SsoSessionService);
  const security = app.get(SsoHttpSecurity);
  const parseJson = json({ limit: "16mb" });
  const parseForm = urlencoded({ limit: "16mb", extended: false });
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    const path = req.url.split("?")[0];
    const hasBody =
      Boolean(req.headers["transfer-encoding"]) || Number(req.headers["content-length"] ?? 0) > 0;
    const isBff = /^\/api\/bff(?:\/|$)/i.test(path);
    const isSession = /^\/api\/session\/(?:current|user|rotate|logout)\/?$/i.test(path);
    if (!isBff && !isSession) {
      return next();
    }
    security.headers(res);
    // Existing stream handlers set Cache-Control themselves; keep private API data uncacheable.
    const setHeader = res.setHeader.bind(res);
    Object.defineProperty(res, "setHeader", {
      value: (name: string, value: string | number | readonly string[]) =>
        setHeader(name, name.toLowerCase() === "cache-control" ? "private, no-store" : value),
    });
    try {
      const origin = security.origin(req);
      if (
        (req.headers.origin !== undefined && req.headers.origin !== origin) ||
        (req.headers["sec-fetch-site"] !== undefined &&
          req.headers["sec-fetch-site"] !== "same-origin")
      ) {
        throw new UnauthorizedException("Unapproved request origin");
      }
      if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        return res.status(405).end();
      }
      // The retained invoice PDF GET/HEAD handler can enqueue generation (including
      // forceRegenerate). Cookie authentication must protect its effects as a command.
      const mutation = !["GET", "HEAD"].includes(req.method);
      const requiresProof =
        mutation || (isBff && /^\/api\/bff\/invoices\/[^/]+\/pdf\/?$/i.test(path));
      if (mutation) {
        security.mutation(req);
      }
      const csrf = req.headers["x-csrf-token"];
      if (requiresProof && (typeof csrf !== "string" || !csrf)) {
        throw new UnauthorizedException("Session CSRF token required");
      }
      const rotate = path === "/api/session/rotate";
      const logout = path === "/api/session/logout";
      if (
        isSession &&
        !(
          (["/api/session/current", "/api/session/user"].includes(path) && req.method === "GET") ||
          ((rotate || logout) && req.method === "POST")
        )
      ) {
        return res.status(405).end();
      }
      const appKey = security.appKey(origin);
      const target = isBff ? bffTarget(path, appKey) : undefined;
      if (isBff && !target) {
        return res.status(404).end();
      }
      if (isBff && !req.headers["content-type"] && hasBody) {
        return res.status(415).json({ message: "A supported Content-Type is required" });
      }
      // Reject conflicting identity assertions. Bearer tokens never bypass cookie checks here.
      if (
        ["authorization", "x-user-id", "x-role-ids", "x-corely-proxy-key", "x-corely-surface"].some(
          (key) => req.headers[key] !== undefined
        )
      ) {
        throw new UnauthorizedException("Client identity assertions are forbidden");
      }
      if (isSession && hasBody) {
        return res.status(413).json({ message: "This session endpoint accepts no request body" });
      }
      if (logout) {
        await sessions.logout(origin, security.cookie(req, SSO_COOKIES.app), csrf as string);
        security.setCookie(res, SSO_COOKIES.app, "", 0);
        return res.status(204).end();
      }
      const result = await sessions.authenticate(
        origin,
        security.cookie(req, SSO_COOKIES.app),
        requiresProof ? (csrf as string) : undefined,
        rotate,
        !isSession || rotate
      );
      if (isSession) {
        if (result.handle) {
          security.setCookie(res, SSO_COOKIES.app, result.handle, result.maxAge);
        }
        if (path === "/api/session/user") {
          const tenantHint = hint(req, "x-tenant-id");
          const workspaceHint = hint(req, "x-workspace-id");
          if (tenantHint || workspaceHint) {
            await sessions.principal(result.userId, tenantHint, workspaceHint);
          }
        }
        const metadata = { csrfToken: result.csrfToken, expiresAt: result.expiresAt };
        return res.json(
          path === "/api/session/user"
            ? { ...metadata, appKey, user: await sessions.profile(result.userId) }
            : metadata
        );
      }
      const principal = await sessions.principal(
        result.userId,
        hint(req, "x-tenant-id"),
        hint(req, "x-workspace-id")
      );
      setSsoSessionPrincipal(req, principal);
      for (const key of Object.keys(req.headers)) {
        if (
          key === "forwarded" ||
          key.startsWith("x-forwarded-") ||
          key.startsWith("x-corely-") ||
          key === "cookie"
        ) {
          delete req.headers[key];
        }
      }
      // Keep the same request/response streams, cancellation, idempotency and trace headers.
      const destination = new URL(target + req.url.slice(path.length), origin);
      if (
        appKey !== "app-center" &&
        // Match Nest/Express's case-insensitive, optional-trailing-slash routes.
        (/^\/menu\/?$/i.test(target) || /^\/workspaces\/[^/]+\/config\/?$/i.test(target))
      ) {
        const declared = destination.searchParams.getAll("launchId");
        if (declared.some((value) => value !== appKey)) {
          throw new BadRequestException("Focused navigation context does not match this app");
        }
        destination.searchParams.set("launchId", appKey);
      }
      req.url = destination.pathname + destination.search;
      if (
        hasBody &&
        req.headers["content-type"] &&
        !req.is("application/json") &&
        !req.is("application/x-www-form-urlencoded")
      ) {
        return res.status(415).json({ message: "Use the existing JSON/base64 upload contract" });
      }
      parseJson(req, res, (error) => {
        if (error) {
          res.status(bodyErrorStatus(error)).json({ message: "Invalid or oversized API request" });
          return;
        }
        parseForm(req, res, (formError) => {
          if (formError) {
            res
              .status(bodyErrorStatus(formError))
              .json({ message: "Invalid or oversized API request" });
            return;
          }
          next();
        });
      });
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 503;
      // Never clear/overwrite a cookie on a failed concurrent rotation; never replay a command.
      res.status(status).json({
        message:
          status === 401
            ? "Session invalid; sign in again"
            : "Session request could not be completed",
      });
    }
  });
}
