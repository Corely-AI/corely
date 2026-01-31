import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class PublicWorkspacePathMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Simplified: Just strip /w/:slug prefix if present
    // This allows the public workspace middleware to handle requests proxied via /w/:slug
    if (typeof req.url === "string" && req.url.startsWith("/w/")) {
      req.url = req.url.replace(/^\/w\/[^/]+/i, "");
    }
    next();
  }
}
