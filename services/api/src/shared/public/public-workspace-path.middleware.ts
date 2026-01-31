import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import * as fs from "fs";

const LOG_FILE = "/tmp/kerniflow-debug.log";

@Injectable()
export class PublicWorkspacePathMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    try {
      if (typeof req.url === "string" && req.url.startsWith("/w/")) {
        const msg = `[${new Date().toISOString()}] Handling: ${req.url}\n`;
        fs.appendFileSync(LOG_FILE, msg);

        req.url = req.url.replace(/^\/w\/[^/]+/i, "");
        fs.appendFileSync(LOG_FILE, `Rewrote to: ${req.url}\n`);
      }
    } catch (e) {
      // Ignore errors in middleware to prevent crash
    }
    next();
  }
}
