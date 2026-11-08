import { SsoEmailCodeService } from "../application/services/sso-email-code.service";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestPassword,
} from "../testkit/sso-test-context";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { SsoController } from "../adapters/http/sso.controller";
import { SsoHttpSecurity } from "../adapters/http/sso-http-security";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { SsoService } from "../application/services/sso.service";
import { ssoTestProxyKey } from "../testkit/sso-test-context";

describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("Corely SSO with isolated PostgreSQL", () => {
  let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
  beforeEach(async () => {
    fixture = await createSsoTestContext();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture?.cleanup();
  });

  it("logs in an existing user without changing memberships or exposing bearer tokens", async () => {
    const login = await fixture.login();
    const result = await fixture.service.callback(origins.app, login.callback, login.handle);
    expect(result.returnPath).toBe("/invoices?view=open#today");
    const session = await fixture.prisma.ssoAppSession.findUniqueOrThrow({
      where: { handleHash: fixture.crypto.hash(result.handle) },
    });
    expect(session.userId).toBe(fixture.userId);
    expect(session.appKey).toBe("app-center");
    expect(
      await fixture.prisma.membership.findUnique({ where: { id: fixture.membership.id } })
    ).toEqual(fixture.membership);
    expect(await fixture.prisma.refreshToken.count({ where: { userId: fixture.userId } })).toBe(0);
    expect(await fixture.prisma.auditLog.count({ where: { actorUserId: fixture.userId } })).toBe(2);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { payloadJson: { contains: fixture.userId } },
      })
    ).toBe(2);
    const transaction = await fixture.store.getTransaction(login.requestId);
    expect(transaction?.verifierCipher).toBe("");
    expect(transaction?.stateCipher).toBe("");
  });
  it("reuses the central session in a second app without credentials", async () => {
    const login = await fixture.login();
    await fixture.service.callback(origins.app, login.callback, login.handle);
    const second = await fixture.start(origins.invoice, "/invoices/123");
    const redirect = new URL(
      (await fixture.service.authorize(second.requestId, login.centralHandle))!
    );
    expect(redirect.origin).toBe(origins.invoice);
    const result = await fixture.service.callback(
      origins.invoice,
      {
        requestId: second.requestId,
        code: redirect.searchParams.get("code")!,
        state: redirect.searchParams.get("state")!,
      },
      second.handle
    );
    expect(result.returnPath).toBe("/invoices/123");
    expect(
      await fixture.prisma.ssoCentralSession.count({ where: { userId: fixture.userId } })
    ).toBe(1);
  });
  it("allows only one concurrent redemption and rejects later replay", async () => {
    const login = await fixture.login();
    const results = await Promise.allSettled([
      fixture.service.callback(origins.app, login.callback, login.handle),
      fixture.service.callback(origins.app, login.callback, login.handle),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(
      fixture.service.callback(origins.app, login.callback, login.handle)
    ).rejects.toThrow();
    expect(await fixture.prisma.ssoAppSession.count({ where: { userId: fixture.userId } })).toBe(1);
  });
  it("rejects stolen state, another browser, another app and a corrupt challenge", async () => {
    const login = await fixture.login();
    await expect(
      fixture.service.callback(
        origins.app,
        { ...login.callback, state: fixture.crypto.secret() },
        login.handle
      )
    ).rejects.toThrow();
    await expect(
      fixture.service.callback(origins.app, login.callback, fixture.crypto.secret())
    ).rejects.toThrow();
    await expect(
      fixture.service.callback(origins.invoice, login.callback, login.handle)
    ).rejects.toThrow();
    await fixture.prisma.ssoLoginTransaction.update({
      where: { id: login.requestId },
      data: { challenge: fixture.crypto.secret() },
    });
    await expect(
      fixture.service.callback(origins.app, login.callback, login.handle)
    ).rejects.toThrow();
    expect(await fixture.prisma.ssoAppSession.count({ where: { userId: fixture.userId } })).toBe(0);
  });
  it("rejects a handoff after code expiry", async () => {
    const login = await fixture.login();
    fixture.advance(60_001);
    await expect(
      fixture.service.callback(origins.app, login.callback, login.handle)
    ).rejects.toThrow();
  });
  it("keeps outstanding tabs bound to the same pre-auth browser independently", async () => {
    const login = await fixture.login();
    const second = await fixture.start(origins.app, "/people/me", login.handle);
    await fixture.service.callback(origins.app, login.callback, login.handle);
    const redirect = new URL(
      (await fixture.service.authorize(second.requestId, login.centralHandle))!
    );
    const result = await fixture.service.callback(
      origins.app,
      {
        requestId: second.requestId,
        code: redirect.searchParams.get("code")!,
        state: redirect.searchParams.get("state")!,
      },
      login.handle
    );
    expect(result.returnPath).toBe("/people/me");
  });
  it("does not provision an unknown account or merge identities by email", async () => {
    const initial = await fixture.start();
    const email = `unknown-${fixture.email}`;
    await expect(
      fixture.service.login(
        {
          requestId: initial.requestId,
          csrfToken: initial.context.csrfToken,
          email,
          password: ssoTestPassword,
        },
        initial.context.handle
      )
    ).rejects.toThrow();
    expect(await fixture.prisma.user.count({ where: { email } })).toBe(0);
  });
  it("does not silently extend an expired central session or authorize a suspended team", async () => {
    const login = await fixture.login();
    fixture.advance(30 * 60_000 + 1);
    const next = await fixture.start(origins.invoice);
    expect(await fixture.service.authorize(next.requestId, login.centralHandle)).toBeNull();
    await fixture.prisma.tenant.update({
      where: { id: fixture.tenantId },
      data: { status: "SUSPENDED" },
    });
    await expect(fixture.login()).rejects.toThrow(/membership/);
  });
  it("ignores a central cookie whose account no longer has team access", async () => {
    const login = await fixture.login();
    await fixture.prisma.membership.delete({ where: { id: fixture.membership.id } });
    const next = await fixture.start(origins.invoice);
    await expect(
      fixture.service.authorize(next.requestId, login.centralHandle)
    ).resolves.toBeNull();
    await expect(
      fixture.service.login(
        {
          requestId: next.requestId,
          csrfToken: next.context.csrfToken,
          email: fixture.email,
          password: ssoTestPassword,
        },
        next.context.handle,
        login.centralHandle
      )
    ).rejects.toMatchObject({ status: 401 });
    expect((await fixture.store.getTransaction(next.requestId))?.codeHash).toBeNull();
  });
  it("does not let an unusable central cookie prevent another eligible account signing in", async () => {
    const login = await fixture.login();
    await fixture.prisma.membership.delete({ where: { id: fixture.membership.id } });
    const otherId = `${fixture.userId}-other`;
    const email = `other-${fixture.email}`;
    const original = await fixture.prisma.user.findUniqueOrThrow({ where: { id: fixture.userId } });
    await fixture.prisma.user.create({
      data: { id: otherId, email, passwordHash: original.passwordHash },
    });
    try {
      await fixture.prisma.membership.create({
        data: { userId: otherId, tenantId: fixture.tenantId, roleId: fixture.membership.roleId },
      });
      const next = await fixture.start(origins.invoice);
      await expect(
        fixture.service.login(
          {
            requestId: next.requestId,
            csrfToken: next.context.csrfToken,
            email,
            password: ssoTestPassword,
          },
          next.context.handle,
          login.centralHandle
        )
      ).resolves.toHaveProperty("centralHandle");
    } finally {
      await fixture.prisma.auditLog.deleteMany({ where: { actorUserId: otherId } });
      await fixture.prisma.outboxEvent.deleteMany({
        where: { payloadJson: { contains: otherId } },
      });
      await fixture.prisma.user.delete({ where: { id: otherId } });
    }
  });
  it("keeps usable central sessions protected against silent account replacement", async () => {
    const login = await fixture.login();
    const next = await fixture.start(origins.invoice);
    await expect(
      fixture.service.login(
        {
          requestId: next.requestId,
          csrfToken: next.context.csrfToken,
          email: fixture.email,
          password: ssoTestPassword,
        },
        next.context.handle,
        login.centralHandle
      )
    ).rejects.toMatchObject({ status: 409 });
  });
  it("propagates central-session access-check outages instead of treating them as signed out", async () => {
    const login = await fixture.login();
    const next = await fixture.start(origins.invoice);
    vi.spyOn(fixture.service, "requireAccess").mockRejectedValueOnce(
      new Error("synthetic access outage")
    );
    await expect(fixture.service.authorize(next.requestId, login.centralHandle)).rejects.toThrow(
      "synthetic access outage"
    );
  });
  it("rejects an expired or cancelled transaction with a recoverable error", async () => {
    const start = await fixture.start();
    fixture.advance(300_001);
    await expect(fixture.service.context(start.requestId, undefined)).rejects.toThrow(/expired/);
    const next = await fixture.start();
    expect(
      await fixture.service.cancel(next.requestId, next.context.handle, next.context.csrfToken)
    ).toBe(`${origins.app}/auth/logged-out`);
    await expect(fixture.service.authorize(next.requestId)).rejects.toThrow();
  });
  it("prevents login CSRF and stops after the durable credential budget", async () => {
    const start = await fixture.start();
    const input = {
      requestId: start.requestId,
      csrfToken: start.context.csrfToken,
      email: fixture.email,
      password: "wrong-password",
    };
    await expect(fixture.service.login(input, fixture.crypto.secret())).rejects.toThrow();
    for (let i = 0; i < 5; i++)
      await expect(fixture.service.login(input, start.context.handle)).rejects.toThrow(
        /credentials/
      );
    await expect(
      fixture.service.login({ ...input, password: ssoTestPassword }, start.context.handle)
    ).rejects.toMatchObject({ status: 429 });
  });
  it("checks current membership again at redemption", async () => {
    const login = await fixture.login();
    await fixture.prisma.membership.delete({ where: { id: fixture.membership.id } });
    await expect(
      fixture.service.callback(origins.app, login.callback, login.handle)
    ).rejects.toThrow(/access/);
  });
  it("rejects revoked families and password reset invalidates central SSO", async () => {
    const login = await fixture.login();
    const next = await fixture.start(origins.invoice);
    await fixture.prisma.user.update({
      where: { id: fixture.userId },
      data: { passwordHash: "synthetic-reset-hash" },
    });
    expect(await fixture.service.authorize(next.requestId, login.centralHandle)).toBeNull();
    await expect(
      fixture.service.callback(origins.app, login.callback, login.handle)
    ).rejects.toThrow();
    await fixture.prisma.ssoCentralSession.updateMany({
      where: { userId: fixture.userId },
      data: { revokedAt: new Date() },
    });
    expect(await fixture.service.authorize(next.requestId, login.centralHandle)).toBeNull();
  });
  it("rolls back family and handoff creation if the transactional audit fails", async () => {
    vi.spyOn(fixture.audit, "write").mockRejectedValueOnce(
      new Error("synthetic audit unavailable")
    );
    await expect(fixture.login()).rejects.toThrow(/audit unavailable/);
    expect(
      await fixture.prisma.ssoCentralSession.count({ where: { userId: fixture.userId } })
    ).toBe(0);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { payloadJson: { contains: fixture.userId } },
      })
    ).toBe(0);
  });
  it("runs the HTTP flow with secure cookies, CSRF and no reflected credentialed CORS", async () => {
    const module = await Test.createTestingModule({
      controllers: [SsoController],
      providers: [
        { provide: SsoEmailCodeService, useValue: fixture.emailCodes },
        { provide: SsoService, useValue: fixture.service },
        {
          provide: SsoHttpSecurity,
          useValue: new SsoHttpSecurity(fixture.registrations, fixture.crypto),
        },
      ],
    }).compile();
    const app = module.createNestApplication({ bodyParser: false });
    configureSsoHttpTransport(app);
    await app.init();
    const headers = (origin: string) => ({
      "x-corely-sso-origin": origin,
      "x-corely-sso-proxy-key": ssoTestProxyKey,
      Accept: "application/json",
    });
    const cookie = (response: request.Response) => response.headers["set-cookie"][0].split(";")[0];
    try {
      const boot = await request(app.getHttpServer())
        .get("/api/session/preauth")
        .set(headers(origins.app))
        .expect(200);
      expect(boot.headers["set-cookie"][0]).toMatch(/Secure/);
      expect(boot.headers["set-cookie"][0]).toMatch(/HttpOnly/);
      expect(boot.headers["set-cookie"][0]).not.toMatch(/Domain=/);
      expect(boot.headers["cache-control"]).toBe("no-store");
      const input = { returnPath: "/invoices", csrfToken: boot.body.csrfToken };
      await request(app.getHttpServer())
        .post("/api/session/login")
        .set(headers(origins.app))
        .set("Origin", "https://evil.corely.test")
        .set("Cookie", cookie(boot))
        .send(input)
        .expect(401);
      const initiated = await request(app.getHttpServer())
        .post("/api/session/login")
        .set(headers(origins.app))
        .set("Origin", origins.app)
        .set("Cookie", cookie(boot))
        .send(input)
        .expect(201);
      const id = new URL(initiated.body.redirectTo).searchParams.get("request")!;
      const page = await request(app.getHttpServer())
        .get(`/sso/authorize?request=${id}`)
        .set(headers(origins.login))
        .expect(303);
      expect(page.headers.location).toBe(`${origins.login}/login?request=${id}`);
      const context = await request(app.getHttpServer())
        .get(`/sso/context?request=${id}`)
        .set(headers(origins.login))
        .set("Origin", "https://evil.corely.test")
        .expect(200);
      expect(context.headers["access-control-allow-origin"]).toBeUndefined();
      const upper = await request(app.getHttpServer())
        .get(`/SSO/context?request=${id}`)
        .set(headers(origins.login))
        .set("Origin", "https://evil.corely.test")
        .expect(200);
      expect(upper.headers["access-control-allow-origin"]).toBeUndefined();
      const alias = await request(app.getHttpServer())
        .get(`/w/synthetic/SSO/context?request=${id}`)
        .set(headers(origins.login))
        .set("Origin", "https://evil.corely.test")
        .expect(404);
      expect(alias.headers["access-control-allow-origin"]).toBeUndefined();
      const login = await request(app.getHttpServer())
        .post("/sso/login")
        .set(headers(origins.login))
        .set("Origin", origins.login)
        .set("Cookie", cookie(context))
        .send({
          requestId: id,
          csrfToken: context.body.csrfToken,
          email: fixture.email,
          password: ssoTestPassword,
        })
        .expect(201);
      expect(login.body).not.toHaveProperty("accessToken");
      expect(login.body).not.toHaveProperty("refreshToken");
      const callback = new URL(login.body.redirectTo);
      const complete = await request(app.getHttpServer())
        .get(`${callback.pathname}${callback.search}`)
        .set(headers(origins.app))
        .set("Cookie", cookie(boot))
        .expect(303);
      expect(complete.headers.location).toBe(`${origins.app}/invoices`);
      expect(cookie(complete)).toMatch(/^__Host-corely-session=/);
      await request(app.getHttpServer())
        .get(`${callback.pathname}${callback.search}`)
        .set(headers(origins.app))
        .set("Cookie", cookie(boot))
        .expect(400);
      const oversized = await request(app.getHttpServer())
        .post("/sso/login")
        .set(headers(origins.login))
        .set("Origin", origins.login)
        .send({ password: "x".repeat(5000) })
        .expect(400);
      expect(oversized.body).not.toHaveProperty("stack");
      vi.spyOn(fixture.store, "getTransaction").mockRejectedValueOnce(
        new Error("synthetic database failure with private details")
      );
      const unavailable = await request(app.getHttpServer())
        .get(`/sso/context?request=${id}`)
        .set(headers(origins.login))
        .expect(503);
      expect(unavailable.body.message).toContain("temporarily unavailable");
      expect(JSON.stringify(unavailable.body)).not.toContain("private details");
    } finally {
      await app.close();
    }
  });
});
