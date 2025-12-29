import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { TraceIdService } from "./trace-id.service";

/**
 * Header name for trace/correlation ID
 */
export const TRACE_ID_HEADER = "x-trace-id";

/**
 * Middleware that extracts or generates a trace ID for each request
 * and attaches it to the request object for use throughout the request lifecycle
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly traceIdService: TraceIdService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Extract from header or generate new
    const traceId = this.traceIdService.extractOrGenerate(
      req.headers[TRACE_ID_HEADER] as string | undefined
    );

    // Attach to request for use in controllers/services
    (req as any).traceId = traceId;

    // Also set response header so clients can see the trace ID
    res.setHeader(TRACE_ID_HEADER, traceId);

    next();
  }
}
