import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthorizeWorkspaceUseCase, ListWorkspacesUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { CliSsoController } from "../adapters/http/cli-sso.controller";
import { SsoController } from "../adapters/http/sso.controller";
import { SSO_COOKIES, SsoHttpSecurity } from "../adapters/http/sso-http-security";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { SsoEmailCodeService } from "../application/services/sso-email-code.service";
import { SsoService } from "../application/services/sso.service";
import { SsoSessionService } from "../application/services/sso-session.service";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "../infrastructure/adapters/prisma-user-repository.adapter";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestProxyKey,
} from "../testkit/sso-test-context";

describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("CLI sign-in with isolated PostgreSQL", () => {
  it("uses browser consent, lists only active workspaces and revokes the CLI credential on logout", async () => {
    const fixture = await createSsoTestContext(origins, true, true);
    const workspaces = new PrismaWorkspaceRepository(fixture.prisma);
    const memberships = new PrismaMembershipRepository(fixture.prisma);
    const sessions = new SsoSessionService(
      fixture.registrations,
      fixture.store,
      fixture.crypto,
      { now: () => new Date() },
      memberships,
      new PrismaTenantRepository(fixture.prisma),
      new AuthorizeRequestContextUseCase(memberships, new AuthorizeWorkspaceUseCase(workspaces)),
      new PrismaUserRepository(fixture.prisma)
    );
    const module = await Test.createTestingModule({
      controllers: [SsoController, CliSsoController],
      providers: [
        { provide: SsoEmailCodeService, useValue: fixture.emailCodes },
        { provide: SsoService, useValue: fixture.service },
        { provide: SsoSessionService, useValue: sessions },
        { provide: ListWorkspacesUseCase, useValue: new ListWorkspacesUseCase(workspaces) },
        {
          provide: SsoHttpSecurity,
          useValue: new SsoHttpSecurity(fixture.registrations, fixture.crypto),
        },
      ],
    }).compile();
    const app = module.createNestApplication({ bodyParser: false, logger: false });
    configureSsoHttpTransport(app);
    await app.init();
    const client = request(app.getHttpServer());
    const ingress = {
      "x-corely-sso-origin": origins.login,
      "x-corely-sso-proxy-key": ssoTestProxyKey,
    };
    try {
      const legal = await fixture.prisma.legalEntity.create({
        data: {
          tenantId: fixture.tenantId,
          kind: "COMPANY",
          legalName: "Studio Demo",
          countryCode: "DE",
          currency: "EUR",
        },
      });
      const workspace = await fixture.prisma.workspace.create({
        data: { tenantId: fixture.tenantId, legalEntityId: legal.id, name: "Berlin Mitte" },
      });
      const membership = await fixture.prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: fixture.userId, role: "MEMBER" },
      });
      const browser = await fixture.login();
      const centralCookie = `${SSO_COOKIES.central}=${browser.centralHandle}`;
      const port = 43124;
      const state = fixture.crypto.secret();
      const verifier = fixture.crypto.secret();
      const started = await client
        .post("/sso/cli/start")
        .set(ingress)
        .send({ port, state, challenge: fixture.crypto.challenge(verifier) })
        .expect(200);
      const start = new URL(started.body.redirectTo);
      const id = start.searchParams.get("request");
      const consent = await client
        .get(start.pathname + start.search)
        .set(ingress)
        .set("Cookie", centralCookie)
        .expect(303);
      const consentUrl = new URL(consent.headers.location);
      const page = await client
        .get(consentUrl.pathname + consentUrl.search)
        .set(ingress)
        .set("Cookie", centralCookie)
        .expect(200);
      expect(page.text).toContain("Continue to Corely CLI");
      const csrfToken = /name="csrfToken" value="([^"]+)"/.exec(page.text)?.[1];
      const approve = () =>
        client
          .post("/sso/cli/consent")
          .set(ingress)
          .set("Cookie", centralCookie)
          .type("form")
          .send({ request: id, csrfToken });
      await approve().set("Accept", "application/json").expect(401);
      const approved = await approve().set("Origin", origins.login).expect(303);
      const callback = new URL(approved.headers.location);
      expect(callback.origin).toBe(`http://127.0.0.1:${port}`);
      expect(callback.searchParams.get("state")).toBe(state);
      const exchanged = await client
        .post("/sso/cli/exchange")
        .set(ingress)
        .send({ request: id, code: callback.searchParams.get("code"), state, verifier, port })
        .expect(200);
      const authorization = `Bearer ${exchanged.body.accessToken}`;
      const account = () =>
        client.get("/sso/cli/account").set(ingress).set("Authorization", authorization);
      const result = await account().expect(200);
      expect(result.body).toEqual({
        userId: fixture.userId,
        email: fixture.email,
        name: "Synthetic colleague",
        workspaces: [
          { id: workspace.id, tenantId: fixture.tenantId, name: "Berlin Mitte", slug: null },
        ],
      });
      await fixture.prisma.workspaceMembership.delete({ where: { id: membership.id } });
      expect((await account().expect(200)).body.workspaces).toEqual([]);
      await client
        .post("/sso/cli/logout")
        .set(ingress)
        .set("Authorization", authorization)
        .expect(204);
      await account().set("Accept", "application/json").expect(401);
    } finally {
      await app.close();
      // Workspace rows reference fixture-owned legal entities with delete restriction.
      await fixture.prisma.workspace.deleteMany({ where: { tenantId: fixture.tenantId } });
      await fixture.cleanup();
    }
  });
});
