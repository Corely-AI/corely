import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { SsoController } from "../adapters/http/sso.controller";
import { configureFocusedObservation } from "../adapters/http/focused-observation.middleware";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { SsoHttpSecurity, SSO_COOKIES } from "../adapters/http/sso-http-security";
import { SsoService } from "../application/services/sso.service";
import { SsoEmailCodeService } from "../application/services/sso-email-code.service";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestProxyKey,
} from "../testkit/sso-test-context";

describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("real SSO callback diagnostics", () => {
  let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
  let app: INestApplication;
  const messages: string[] = [];
  beforeEach(async () => {
    messages.length = 0;
    fixture = await createSsoTestContext();
    const module = await Test.createTestingModule({
      controllers: [SsoController],
      providers: [
        { provide: SsoService, useValue: fixture.service },
        { provide: SsoEmailCodeService, useValue: fixture.emailCodes },
        {
          provide: SsoHttpSecurity,
          useValue: new SsoHttpSecurity(fixture.registrations, fixture.crypto),
        },
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    configureFocusedObservation(app);
    configureSsoHttpTransport(app);
    await app.init();
    vi.spyOn(Logger.prototype, "log").mockImplementation((message: unknown) => {
      if (typeof message === "string" && message.startsWith('{"eventName":"corely.focused"')) {
        messages.push(message);
      }
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    await fixture?.cleanup();
  });
  it("records successful completion and replay failure with no handoff proofs", async () => {
    const login = await fixture.login(origins.invoice);
    const query = {
      request: login.callback.requestId,
      code: login.callback.code,
      state: login.callback.state,
    };
    const headers = {
      "x-corely-sso-origin": origins.invoice,
      "x-corely-sso-proxy-key": ssoTestProxyKey,
      Cookie: `${SSO_COOKIES.preauth}=${login.handle}`,
    };
    await request(app.getHttpServer()).get("/auth/callback").query(query).set(headers).expect(303);
    await request(app.getHttpServer()).get("/auth/callback").query(query).set(headers).expect(400);
    const events = messages.map((message) => JSON.parse(message) as Record<string, unknown>);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ surface: "invoice", event: "callback", outcome: "ok" });
    expect(events[1]).toMatchObject({ surface: "invoice", event: "callback", outcome: "rejected" });
    for (const secret of [
      login.callback.requestId,
      login.callback.code,
      login.callback.state,
      login.handle,
      ssoTestProxyKey,
    ]) {
      expect(messages.join(" ")).not.toContain(secret);
    }
  });
});
