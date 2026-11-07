import { HttpException, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

/** Bounded per-process defense. Production additionally needs an edge/distributed limit. */
@Injectable()
export class OpenBukRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, { count: number; expiresAt: number }>();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    for (const [key, value] of this.buckets) {
      if (value.expiresAt <= now) {
        this.buckets.delete(key);
      }
    }
    // Express owns trusted-proxy handling; never trust a raw forwarded-for header.
    const key = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const bucket = this.buckets.get(key);
    if ((!bucket && this.buckets.size >= 10000) || (bucket && bucket.count >= 60)) {
      throw new HttpException("Booking:RateLimited", 429);
    }
    if (bucket) {
      bucket.count++;
    } else {
      this.buckets.set(key, { count: 1, expiresAt: now + 60000 });
    }
    return true;
  }
}
