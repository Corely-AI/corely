import { Logger, type INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { context, propagation, trace, SpanStatusCode } from "@opentelemetry/api";
import {
  FocusedObservationSchema,
  focusedOutcome,
  focusedRequestEvent,
  type FocusedObservation,
  type FocusedSurface,
} from "@corely/contracts";
import { isSsoRoute, SsoHttpSecurity } from "./sso-http-security";

const logger = new Logger("FocusedObservation");
const tracer = trace.getTracer("corely.focused");
export type FocusedObservationSink = (event: FocusedObservation) => void;
export function focusedObservationMiddleware(
  resolveSurface: (request: Parameters<RequestHandler>[0]) => FocusedSurface,
  emit: FocusedObservationSink = (event) =>
    logger.log(JSON.stringify({ eventName: "corely.focused", ...event }))
): RequestHandler {
  return (req, res, next) => {
    if (!isSsoRoute(req.path)) {
      return next();
    }
    let surface: FocusedSurface = "unknown";
    try {
      surface = resolveSurface(req);
    } catch {
      /* Untrusted ingress is never labeled as an app. */
    }
    const requestIdInput = FocusedObservationSchema.shape.requestId.safeParse(
      req.headers["x-request-id"]
    );
    const requestId =
      requestIdInput.success && requestIdInput.data ? requestIdInput.data : randomUUID();
    // Reuse valid request IDs, preserve existing trace/correlation headers, and never log their raw values.
    if (!req.headers["x-request-id"]) {
      req.headers["x-request-id"] = requestId;
    }
    res.setHeader("X-Request-Id", requestId);
    const event = focusedRequestEvent(req.path);
    const carrier = {
      traceparent: typeof req.headers.traceparent === "string" ? req.headers.traceparent : "",
    };
    const parent = propagation.extract(context.active(), carrier);
    const span = tracer.startSpan(
      "focused.http",
      { attributes: { "corely.surface": surface, "corely.event": event, "request.id": requestId } },
      parent
    );
    let recorded = false;
    const finish = (aborted: boolean) => {
      if (recorded) {
        return;
      }
      recorded = true;
      const outcome = aborted ? "aborted" : focusedOutcome(res.statusCode);
      const observation = FocusedObservationSchema.parse({
        surface,
        layer: "server",
        event,
        outcome,
        requestId,
      });
      span.setAttributes({
        "corely.outcome": outcome,
        "http.response.status_code": res.statusCode,
      });
      if (outcome === "unavailable") {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      // Expected access denials are observations, not service incidents.
      try {
        emit(observation);
      } catch {
        /* Telemetry cannot change the HTTP result. */
      }
      span.end();
    };
    res.once("finish", () => finish(false));
    res.once("close", () => finish(!res.writableFinished));
    context.with(trace.setSpan(parent, span), next);
  };
}
export function configureFocusedObservation(app: INestApplication): void {
  const security = app.get(SsoHttpSecurity);
  app.use(
    focusedObservationMiddleware((req) => {
      const central = /^\/sso(?:\/|$)/i.test(req.path);
      const origin = security.origin(req, central);
      return central ? "login" : security.appKey(origin);
    })
  );
}
