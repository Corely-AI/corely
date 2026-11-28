import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from "@nestjs/common";
import type { Response } from "express";

/** Private payloads and bearer download links must be authorized again on each retrieval. */
@Injectable()
export class PrivateResponseInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<unknown>) {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader("Cache-Control", "private, no-store");
    return next.handle();
  }
}
