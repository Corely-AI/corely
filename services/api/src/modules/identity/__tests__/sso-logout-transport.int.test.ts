import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { SsoSessionService } from "../application/services/sso-session.service";
import { SsoHttpSecurity, SSO_COOKIES } from "../adapters/http/sso-http-security";
import { configureSsoSessionTransport } from "../adapters/http/sso-session-transport";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "../infrastructure/adapters/prisma-user-repository.adapter";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestProxyKey,
} from "../testkit/sso-test-context";

describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("global logout HTTP contract", () => {
  let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
  let app: INestApplication;
  let handle: string;
  let csrfToken: string;
  beforeEach(async () => {
    fixture = await createSsoTestContext();
    const members = new PrismaMembershipRepository(fixture.prisma);
    const sessions = new SsoSessionService(
      fixture.registrations,
      fixture.store,
      fixture.crypto,
      { now: () => new Date() },
      members,
      new PrismaTenantRepository(fixture.prisma),
      new AuthorizeRequestContextUseCase(
        members,
        new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(fixture.prisma))
      ),
      new PrismaUserRepository(fixture.prisma)
    );
    const login = await fixture.login(origins.invoice);
    handle = (await fixture.service.callback(origins.invoice, login.callback, login.handle)).handle;
    csrfToken = (await sessions.authenticate(origins.invoice, handle)).csrfToken;
    const module = await Test.createTestingModule({
      providers: [
        { provide: SsoSessionService, useValue: sessions },
        {
          provide: SsoHttpSecurity,
          useValue: new SsoHttpSecurity(fixture.registrations, fixture.crypto),
        },
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    configureSsoSessionTransport(app);
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    await fixture?.cleanup();
  });
  function headers() {
    return {
      "x-corely-sso-origin": origins.invoice,
      "x-corely-sso-proxy-key": ssoTestProxyKey,
      Cookie: `${SSO_COOKIES.app}=${handle}`,
    };
  }
  it("requires same-origin POST/proof for global logout and expires only the app cookie", async () => {
    await request(app.getHttpServer()).get("/api/session/logout").set(headers()).expect(405);
    for (const origin of [undefined, origins.hr]) {
      const req = request(app.getHttpServer())
        .post("/api/session/logout")
        .set(headers())
        .set("x-csrf-token", csrfToken);
      if (origin) {
        req.set("Origin", origin);
      }
      await req.expect(401);
    }
    await request(app.getHttpServer())
      .post("/api/session/logout")
      .set(headers())
      .set("Origin", origins.invoice)
      .set("x-csrf-token", "forged")
      .expect(401);
    await request(app.getHttpServer())
      .post("/api/session/logout")
      .set(headers())
      .set("Origin", origins.invoice)
      .set("x-csrf-token", csrfToken)
      .send({ ignored: true })
      .expect(413);
    const result = await request(app.getHttpServer())
      .post("/api/session/logout")
      .set(headers())
      .set("Origin", origins.invoice)
      .set("x-csrf-token", csrfToken)
      .expect(204);
    expect(result.headers["cache-control"]).toContain("no-store");
    expect(result.headers["set-cookie"][0]).toContain("__Host-corely-session=;");
    expect(result.headers["set-cookie"][0]).toContain("Max-Age=0");
    expect(result.headers.location).toBeUndefined();
    await request(app.getHttpServer()).get("/api/session/current").set(headers()).expect(401);
    await request(app.getHttpServer()).get("/api/bff/invoices").set(headers()).expect(401);
  });
});
