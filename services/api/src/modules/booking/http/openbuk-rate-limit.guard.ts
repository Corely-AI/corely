import { createHash } from "node:crypto";
import {
  applyDecorators,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaExtKvAdapter } from "@corely/data";
import type { Request, Response } from "express";

const WINDOW_MS = 60_000;
const BUDGET_KEY = Symbol("booking.public.rate-budget");

@Injectable()
export class OpenBukRateLimitGuard implements CanActivate {
  constructor(
    @Inject(PrismaExtKvAdapter)
    private readonly counters: Pick<PrismaExtKvAdapter, "claimFixedWindow">,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const client = (request.ip ?? request.socket.remoteAddress ?? "unknown")
      .replace(/^::ffff:/i, "")
      .toLowerCase();
    const legacy = this.reflector.get<boolean>(BUDGET_KEY, context.getHandler());
    const budget = legacy ? "legacy-write" : "openbuk";
    // A bounded bucket space keeps anonymous addresses out of storage and limits row growth.
    const bucket = createHash("sha256").update(client).digest("hex").slice(0, 4);
    const key = {
      tenantId: "__public_platform__",
      moduleId: "booking",
      scope: `public-rate:${budget}`,
      key: bucket,
    };
    let allowed: boolean;
    try {
      allowed = await this.counters.claimFixedWindow(key, legacy ? 30 : 60, WINDOW_MS);
    } catch {
      http.getResponse<Response>().setHeader("Retry-After", "60");
      throw new ServiceUnavailableException("Booking is temporarily unavailable");
    }
    if (!allowed) {
      http.getResponse<Response>().setHeader("Retry-After", "60");
      throw new HttpException("Booking:RateLimited", 429);
    }
    return true;
  }
}

export const LegacyPublicBookingRateLimit = () =>
  applyDecorators(SetMetadata(BUDGET_KEY, true), UseGuards(OpenBukRateLimitGuard));
