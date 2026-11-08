import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { Logger, type INestApplication } from "@nestjs/common";
import type { Request, Response } from "express";
import request from "supertest";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { PublicWorkspacePathMiddleware } from "../../../shared/public/public-workspace-path.middleware";

describe("SSO transport before public workspace rewriting", () => {
  let app: INestApplication;
  let debug: ReturnType<typeof vi.spyOn>;
  beforeEach(async () => {
    debug = vi.spyOn(Logger.prototype, "debug").mockImplementation(() => {});
    const module = await Test.createTestingModule({}).compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    configureSsoHttpTransport(app);
    const middleware = new PublicWorkspacePathMiddleware();
    app.use(middleware.use.bind(middleware));
    app.use((req: Request, res: Response) => res.json({ path: req.path }));
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });
  it.each([
    "/w/team/auth/callback",
    "/auth/w/team/callback",
    "/auth/other/../w/team/callback",
    "/api/%2e/w/team/session/preauth",
    "/api/w/team/session/preauth",
    "/api/session/w/team/login",
    "/sso/w/team/authorize",
  ])("rejects %s before CORS reflection or workspace logging", async (path) => {
    const response = await request(app.getHttpServer())
      .get(`${path}?request=synthetic-request&code=synthetic-code&state=synthetic-state`)
      .set("Origin", "https://untrusted.example")
      .expect(404);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(debug).not.toHaveBeenCalled();
  });
  it("keeps legacy public workspace rewriting and CORS for non-SSO routes", async () => {
    const response = await request(app.getHttpServer())
      .get("/w/team/public/booking")
      .set("Origin", "https://public.example")
      .expect(200);
    expect(response.body.path).toBe("/public/booking");
    expect(response.headers["access-control-allow-origin"]).toBe("https://public.example");
  });
});
