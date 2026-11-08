import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Controller, Get, Req, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Request } from "express";
import request from "supertest";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestProxyKey,
} from "../../identity/testkit/sso-test-context";
import { SsoSessionService } from "../../identity/application/services/sso-session.service";
import { SsoHttpSecurity, SSO_COOKIES } from "../../identity/adapters/http/sso-http-security";
import { configureSsoSessionTransport } from "../../identity/adapters/http/sso-session-transport";
import { PrismaMembershipRepository } from "../../identity/infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../../identity/infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "../../identity/infrastructure/adapters/prisma-user-repository.adapter";
import { AuthorizeRequestContextUseCase } from "../../identity/application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";

@Controller()
class NavigationProbe {
  @Get(["menu", "workspaces/:workspaceId/config"])
  read(@Req() req: Request) {
    return { launchId: req.query.launchId, scope: req.query.scope };
  }
}
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("host-bound navigation context", () => {
  let f: Awaited<ReturnType<typeof createSsoTestContext>>;
  let app: INestApplication;
  beforeEach(async () => {
    f = await createSsoTestContext();
    const members = new PrismaMembershipRepository(f.prisma);
    const sessions = new SsoSessionService(
      f.registrations,
      f.store,
      f.crypto,
      { now: () => new Date() },
      members,
      new PrismaTenantRepository(f.prisma),
      new AuthorizeRequestContextUseCase(
        members,
        new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(f.prisma))
      ),
      new PrismaUserRepository(f.prisma)
    );
    const module = await Test.createTestingModule({
      controllers: [NavigationProbe],
      providers: [
        { provide: SsoSessionService, useValue: sessions },
        { provide: SsoHttpSecurity, useValue: new SsoHttpSecurity(f.registrations, f.crypto) },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false, bodyParser: false });
    configureSsoSessionTransport(app);
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    await f?.cleanup();
  });
  it.each(["invoice", "hr"] as const)(
    "pins %s menu/config context to the registered host and rejects conflicts",
    async (key) => {
      const origin = origins[key];
      const login = await f.login(origin);
      const session = await f.service.callback(origin, login.callback, login.handle);
      const headers = {
        "x-corely-sso-origin": origin,
        "x-corely-sso-proxy-key": ssoTestProxyKey,
        Cookie: `${SSO_COOKIES.app}=${session.handle}`,
      };
      for (const target of [
        "menu",
        "menu/",
        "workspaces/selected/config",
        "workspaces/selected/config/",
        "workspaces/selected/CONFIG",
      ]) {
        const response = await request(app.getHttpServer())
          .get(`/api/bff/${target}?scope=web`)
          .set(headers)
          .expect(200);
        expect(response.body).toEqual({ scope: "web", launchId: key });
        await request(app.getHttpServer())
          .get(`/api/bff/${target}?launchId=${key === "invoice" ? "hr" : "invoice"}`)
          .set(headers)
          .expect(400);
      }
    }
  );
});
