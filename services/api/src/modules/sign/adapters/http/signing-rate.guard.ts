import { CanActivate, ExecutionContext, HttpException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { createHash } from "node:crypto";
@Injectable()
export class SigningRateGuard implements CanActivate {
  private readonly buckets = new Map<string, number>();
  private window = 0;
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>(),
      now = Math.floor(Date.now() / 60000);
    if (now !== this.window) {
      this.buckets.clear();
      this.window = now;
    }
    // The API may sit behind the public surface's proxy. Bound both aggregate work and individual sessions.
    const peer = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const session = /corely_sign_session=([\w-]{43})/.exec(req.headers.cookie ?? "")?.[1];
    const credential =
      session ?? (typeof req.body?.token === "string" ? req.body.token.slice(0, 64) : "anonymous");
    const keyed = createHash("sha256").update(credential).digest("hex");
    for (const [key, limit] of [
      [peer, 1800],
      [keyed, 90],
    ] as const) {
      const count = this.buckets.get(key) ?? 0;
      if (count >= limit || (!count && this.buckets.size >= 15000)) {
        throw new HttpException("Too many signing requests", 429);
      }
      this.buckets.set(key, count + 1);
    }
    return true;
  }
}
