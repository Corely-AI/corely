import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Controller, Get, Post, Req, Res, UseGuards, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request, Response } from "express";
import request from "supertest";
import { ok } from "@corely/kernel";
import { SsoSessionService } from "../application/services/sso-session.service";
import { SsoHttpSecurity, SSO_COOKIES } from "../adapters/http/sso-http-security";
import { configureSsoSessionTransport, bffTarget } from "../adapters/http/sso-session-transport";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { AuthGuard } from "../adapters/http/auth.guard";
import { TOKEN_SERVICE_TOKEN } from "../application/ports/token-service.port";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { InvoicesHttpController } from "../../invoices/adapters/http/invoices.controller";
import { InvoicesApplication } from "../../invoices/application/invoices.application";
import { StaffController } from "../../people/adapters/http/staff.controller";
import { StaffDirectoryUseCase } from "../../people/application/staff-directory.usecase";
import { StaffAvailabilityUseCase } from "../../people/application/staff-availability.usecase";
import { PublicWorkspacePathMiddleware } from "../../../shared/public/public-workspace-path.middleware";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestProxyKey,
} from "../testkit/sso-test-context";

const streamClosed = vi.fn();

// Synthetic transfer handlers test HTTP byte/stream behavior, not business authorization.
@Controller("documents")
@UseGuards(AuthGuard)
class TransferProbe {
  @Post("probe")
  upload(@Req() req: Request) {
    return {
      body: req.body,
      idempotency: req.headers["idempotency-key"],
      trace: req.headers["x-trace-id"],
      query: req.query,
      forwarded: req.headers["x-forwarded-host"],
    };
  }
  @Get("probe")
  download(@Res() res: Response) {
    res
      .set("Content-Disposition", 'attachment; filename="synthetic.bin"')
      .type("application/octet-stream")
      .send(Buffer.from([0, 255, 1, 128]));
  }
  @Get("stream")
  stream(@Res() res: Response) {
    res.type("text/event-stream");
    res.set("Cache-Control", "no-cache");
    res.flushHeaders();
    res.write("data: first\n\n");
    const timer = setTimeout(() => res.end("data: second\n\n"), 500);
    res.on("close", () => {
      clearTimeout(timer);
      streamClosed();
    });
  }
}

describe("BFF target allowlist", () => {
  it.each([
    "/api/bff/https://evil.test",
    "/api/bff/auth/login",
    "/api/bff/internal/invoices",
    "/api/bff/invoices/public/id",
    "/api/bff/invoices/w/team/id",
    "/api/bff/invoices/%2e%2e/auth",
    "/api/bff/invoices/../auth",
    "/api/bff//invoices",
    "/api/bff/invoices\\x",
  ])("rejects %s", (path) => {
    expect(bffTarget(path, "invoice")).toBeUndefined();
  });
  it("keeps the Invoice and HR transport on explicit existing owners", () => {
    expect(bffTarget("/api/bff/invoices/id/pdf", "invoice")).toBe("/invoices/id/pdf");
    expect(bffTarget("/api/bff/people/staff", "hr")).toBe("/people/staff");
    expect(bffTarget("/api/bff/people/staff", "invoice")).toBeUndefined();
  });
});

describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)(
  "BFF HTTP adapter with real host sessions",
  () => {
    let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
    let app: INestApplication;
    let handle: string;
    let csrfToken: string;
    const invoiceList = vi.fn(async () => ok({ invoices: [], nextCursor: null }));
    const staffList = vi.fn(async () => ({ items: [] }));
    beforeEach(async () => {
      streamClosed.mockClear();
      invoiceList.mockClear();
      staffList.mockClear();
      fixture = await createSsoTestContext();
      const members = new PrismaMembershipRepository(fixture.prisma);
      const authorize = new AuthorizeRequestContextUseCase(
        members,
        new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(fixture.prisma))
      );
      const sessions = new SsoSessionService(
        fixture.registrations,
        fixture.store,
        fixture.crypto,
        { now: () => new Date() },
        members,
        new PrismaTenantRepository(fixture.prisma),
        authorize
      );
      const login = await fixture.login(origins.invoice);
      handle = (await fixture.service.callback(origins.invoice, login.callback, login.handle))
        .handle;
      csrfToken = (await sessions.authenticate(origins.invoice, handle)).csrfToken;
      const module = await Test.createTestingModule({
        controllers: [InvoicesHttpController, StaffController, TransferProbe],
        providers: [
          AuthGuard,
          { provide: SsoSessionService, useValue: sessions },
          {
            provide: SsoHttpSecurity,
            useValue: new SsoHttpSecurity(fixture.registrations, fixture.crypto),
          },
          { provide: AuthorizeRequestContextUseCase, useValue: authorize },
          { provide: TOKEN_SERVICE_TOKEN, useValue: { verifyAccessToken: async () => null } },
          { provide: InvoicesApplication, useValue: { listInvoices: { execute: invoiceList } } },
          { provide: StaffDirectoryUseCase, useValue: { list: staffList } },
          { provide: StaffAvailabilityUseCase, useValue: {} },
        ],
      }).compile();
      app = module.createNestApplication({ bodyParser: false, logger: false });
      configureSsoSessionTransport(app);
      configureSsoHttpTransport(app);
      const publicPaths = new PublicWorkspacePathMiddleware();
      app.use(publicPaths.use.bind(publicPaths));
      await app.listen(0, "127.0.0.1");
    });
    afterEach(async () => {
      await app?.close();
      await fixture?.cleanup();
    });
    function headers(origin = origins.invoice, cookie = handle) {
      return {
        "x-corely-sso-origin": origin,
        "x-corely-sso-proxy-key": ssoTestProxyKey,
        Cookie: `${SSO_COOKIES.app}=${cookie}`,
      };
    }
    it("dispatches to the original Invoice and HR controllers with revalidated membership", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/bff/invoices")
        .set(headers())
        .set("Origin", origins.invoice)
        .expect(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
      expect(response.headers["cache-control"]).toContain("no-store");
      expect(invoiceList.mock.calls[0]?.[1]).toMatchObject({
        userId: fixture.userId,
        tenantId: fixture.tenantId,
      });
      const login = await fixture.login(origins.hr);
      const hr = await fixture.service.callback(origins.hr, login.callback, login.handle);
      await request(app.getHttpServer())
        .get("/api/bff/people/staff")
        .set(headers(origins.hr, hr.handle))
        .expect(200);
      expect(staffList.mock.calls[0]?.[1]).toMatchObject({
        userId: fixture.userId,
        tenantId: fixture.tenantId,
      });
      await request(app.getHttpServer())
        .get("/api/bff/invoices")
        .set(headers())
        .set("x-tenant-id", "another-tenant")
        .expect(401);
      await request(app.getHttpServer())
        .get("/api/bff/invoices")
        .set(headers())
        .set("x-workspace-id", "another-workspace")
        .expect(403);
      expect(invoiceList).toHaveBeenCalledTimes(1);
    });
    it("returns only CSRF/expiry and sets a rotated Secure HttpOnly host-only cookie", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/session/rotate")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .expect(200);
      expect(Object.keys(response.body).sort()).toEqual(["csrfToken", "expiresAt"]);
      const cookie = response.headers["set-cookie"][0];
      expect(cookie).toContain("__Host-corely-session=");
      for (const attribute of ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"]) {
        expect(cookie).toContain(attribute);
      }
      expect(cookie).not.toContain("Domain=");
      const replay = await request(app.getHttpServer())
        .post("/api/session/rotate")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .expect(401);
      expect(replay.headers["set-cookie"]).toBeUndefined();
    });
    it("rejects rotation bodies before replacing the cookie", async () => {
      await request(app.getHttpServer())
        .post("/api/session/rotate")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .send({ ignored: true })
        .expect(413);
      await request(app.getHttpServer()).get("/api/session/current").set(headers()).expect(200);
    });
    it("rejects sibling origins, forged identity/proxy headers and ambiguous cookies", async () => {
      for (const origin of ["https://evil.example", origins.hr, "null"]) {
        await request(app.getHttpServer())
          .post("/api/bff/documents/probe")
          .set(headers())
          .set("Origin", origin)
          .set("x-csrf-token", csrfToken)
          .send({})
          .expect(401);
      }
      for (const name of [
        "Authorization",
        "x-user-id",
        "x-role-ids",
        "x-corely-proxy-key",
        "x-corely-surface",
      ]) {
        await request(app.getHttpServer())
          .get("/api/bff/invoices")
          .set(headers())
          .set(name, "forged")
          .expect(401);
      }
      await request(app.getHttpServer())
        .get("/api/bff/invoices")
        .set(headers())
        .set("x-corely-sso-proxy-key", "forged")
        .expect(401);
      await request(app.getHttpServer())
        .get("/api/bff/invoices")
        .set(headers())
        .set("Cookie", `${SSO_COOKIES.app}=${handle}; ${SSO_COOKIES.app}=${handle}`)
        .expect(401);
      await request(app.getHttpServer())
        .get("/api/bff/invoices")
        .set(headers())
        .set("sec-fetch-site", "same-site")
        .expect(401);
      expect(invoiceList).not.toHaveBeenCalled();
    });
    it("requires Origin and valid CSRF before any cookie mutation", async () => {
      await request(app.getHttpServer())
        .post("/api/bff/documents/probe")
        .set(headers())
        .set("x-csrf-token", csrfToken)
        .send({})
        .expect(401);
      for (const csrf of [undefined, "invalid"]) {
        const req = request(app.getHttpServer())
          .post("/api/bff/documents/probe")
          .set(headers())
          .set("Origin", origins.invoice);
        if (csrf) {
          req.set("x-csrf-token", csrf);
        }
        await req.send({}).expect(401);
      }
      const response = await request(app.getHttpServer())
        .options("/api/bff/documents/probe")
        .set(headers())
        .set("Origin", origins.invoice)
        .expect(405);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    });
    it("preserves JSON/base64 uploads, downloads, query, idempotency and trace headers", async () => {
      const payload = {
        filename: "synthetic.bin",
        base64: Buffer.from([0, 255, 1, 128]).toString("base64"),
      };
      const response = await request(app.getHttpServer())
        .post("/api/bff/documents/probe?view=original")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .set("Idempotency-Key", "synthetic-command-1")
        .set("x-trace-id", "synthetic-trace")
        .set("x-forwarded-host", "evil.example")
        .send(payload)
        .expect(201);
      expect(response.body).toEqual({
        body: payload,
        idempotency: "synthetic-command-1",
        trace: "synthetic-trace",
        query: { view: "original" },
      });
      const download = await request(app.getHttpServer())
        .get("/api/bff/documents/probe")
        .set(headers())
        .expect(200);
      expect(download.body).toEqual(Buffer.from([0, 255, 1, 128]));
      expect(download.headers["content-disposition"]).toContain("synthetic.bin");
    });
    it("streams the first SSE event before completion and propagates cancellation", async () => {
      const response = await fetch(`${await app.getUrl()}/api/bff/documents/stream`, {
        headers: headers(),
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      const reader = response.body!.getReader();
      expect(new TextDecoder().decode((await reader.read()).value)).toBe("data: first\n\n");
      await reader.cancel();
      await expect.poll(() => streamClosed.mock.calls.length).toBe(1);
      const complete = await fetch(`${await app.getUrl()}/api/bff/documents/stream`, {
        headers: headers(),
      });
      expect(await complete.text()).toBe("data: first\n\ndata: second\n\n");
    });
    it("rejects expired cookies without replaying mutations or redirecting", async () => {
      await fixture.prisma.ssoAppSession.updateMany({
        where: { userId: fixture.userId },
        data: { idleExpiresAt: new Date(0) },
      });
      const response = await request(app.getHttpServer())
        .post("/api/bff/documents/probe")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .send({})
        .expect(401);
      expect(response.headers.location).toBeUndefined();
      expect(response.headers["set-cookie"]).toBeUndefined();
    });
    it("limits both declared and chunked JSON bodies and rejects unsupported upload formats", async () => {
      await request(app.getHttpServer())
        .post("/api/bff/documents/probe")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .send({ content: "x".repeat(16 * 1024 * 1024) })
        .expect(413);
      await request(app.getHttpServer())
        .post("/api/bff/documents/probe")
        .set(headers())
        .set("Origin", origins.invoice)
        .set("x-csrf-token", csrfToken)
        .set("Content-Type", "application/octet-stream")
        .send(Buffer.from([1]))
        .expect(415);
    });
  }
);
