import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

const PUBLIC_PREFIX_REGEX = /^\/w\/[^/]+\/public(\/|$)/i;

@Injectable()
export class PublicWorkspacePathMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (typeof req.url === "string" && PUBLIC_PREFIX_REGEX.test(req.url)) {
      req.url = req.url.replace(/^\/w\/[^/]+/i, "");
    }
    next();
  }
}
