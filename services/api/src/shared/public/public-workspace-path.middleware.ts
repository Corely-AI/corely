import { Injectable, type NestMiddleware, Logger } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class PublicWorkspacePathMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PublicWorkspacePathMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    const raw = (req.originalUrl ?? req.url) as string;
    this.logger.debug(`[Middleware] Incoming request: ${raw}`);

    const u = new URL(raw, "http://local"); // base required for relative URLs

    // Match: [anything]/w/:slug[anything]
    const m = u.pathname.match(/^(.*?)\/w\/([^/]+)(\/.*)?$/);

    if (!m) {
      this.logger.debug(`[Middleware] No workspace slug matched in path: ${u.pathname}`);
      return next();
    }

    const before = m[1] || ""; // e.g. "/api" or ""
    const slug = m[2]; // e.g. "workspace-b2b"
    const after = m[3] ?? "/"; // e.g. "/public/rentals/properties"

    this.logger.debug(
      `[Middleware] Match found - Before: '${before}', Slug: '${slug}', After: '${after}'`
    );

    // Keep "/api" (or any prefix), remove "/w/:slug"
    u.pathname = `${before}${after}` || "/";

    // If you want workspace available as query param:
    u.searchParams.set("w", slug);
    // If you want NO w param at all, use this instead:
    // u.searchParams.delete("w");

    // Rewrite routing url (path + query)
    req.url = u.pathname + u.search;

    this.logger.debug(`[Middleware] Rewritten URL: ${req.url}`);

    // Keep req.query consistent for Nest handlers
    const queryObj = Object.fromEntries(u.searchParams.entries());
    Object.defineProperty(req, "query", {
      value: queryObj,
      writable: true,
      configurable: true,
    });

    this.logger.debug(`[Middleware] Updated req.query: ${JSON.stringify(queryObj)}`);

    next();
  }
}
