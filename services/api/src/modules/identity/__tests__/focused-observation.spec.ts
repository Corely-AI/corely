import { afterAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { trace } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { FocusedObservation } from "@corely/contracts";
import { focusedObservationMiddleware } from "../adapters/http/focused-observation.middleware";
const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
trace.setGlobalTracerProvider(provider);
afterAll(async () => {
  await provider.shutdown();
  trace.disable();
});

describe("focused request observations", () => {
  it.each([200, 303, 401, 403, 429, 503])(
    "records %s once with no credentials, URL or business payload",
    async (status) => {
      const events: FocusedObservation[] = [];
      const app = express();
      app.use(
        focusedObservationMiddleware(
          () => "invoice",
          (event) => events.push(event)
        )
      );
      app.get("/auth/callback", (_req, res) => res.status(status).end());
      const id = "e93f4120-1e2d-49c0-a390-fbc0b5a9f5b9";
      const response = await request(app)
        .get("/auth/callback?code=secret-code&state=secret-state")
        .set("X-Request-Id", id)
        .set("Cookie", "private-session")
        .set("X-Correlation-Id", "private-correlation");
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        surface: "invoice",
        layer: "server",
        event: "callback",
        requestId: id,
      });
      expect(response.headers["x-request-id"]).toBe(id);
      const span = exporter.getFinishedSpans().at(-1);
      expect(span?.attributes["request.id"]).toBe(id);
      expect(span?.status.code).toBe(status >= 500 ? 2 : 0);
      expect(JSON.stringify({ events, attributes: span?.attributes })).not.toMatch(
        /secret|private-session|private-correlation|code=/
      );
    }
  );
  it("does not trust client surface assertions and replaces non-UUID diagnostics IDs", async () => {
    const events: FocusedObservation[] = [];
    const app = express();
    app.use(
      focusedObservationMiddleware(
        () => {
          throw new Error("untrusted ingress");
        },
        (event) => events.push(event)
      )
    );
    app.get("/api/session/user", (_req, res) => res.status(401).end());
    await request(app)
      .get("/api/session/user")
      .set("X-Corely-Surface", "hr")
      .set("X-Request-Id", "a".repeat(43));
    expect(events[0]).toMatchObject({ surface: "unknown", outcome: "unauthenticated" });
    expect(events[0]?.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(events)).not.toContain("a".repeat(43));
  });
  it("keeps ordinary API traffic and telemetry failures outside the session control flow", async () => {
    const app = express();
    let count = 0;
    app.use(
      focusedObservationMiddleware(
        () => "invoice",
        () => {
          count++;
          throw new Error("collector offline");
        }
      )
    );
    app.get("/api/session/user", (_req, res) => res.status(403).end());
    app.get("/invoices/private", (_req, res) => res.status(200).end());
    await request(app).get("/api/session/user").expect(403);
    await request(app).get("/invoices/private").expect(200);
    expect(count).toBe(1);
  });
});
