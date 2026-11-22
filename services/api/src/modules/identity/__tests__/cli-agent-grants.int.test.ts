import { createHash, randomUUID } from "node:crypto";
import { cliAgentProof } from "@corely/contracts";
import { PrismaExtKvAdapter, PrismaUnitOfWork } from "@corely/data";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthorizeWorkspaceUseCase, ListWorkspacesUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { CliAgentController } from "../adapters/http/cli-agent.controller";
import { CliSsoController } from "../adapters/http/cli-sso.controller";
import { SsoHttpSecurity } from "../adapters/http/sso-http-security";
import { configureSsoHttpTransport } from "../adapters/http/sso-http-transport";
import { CliAgentGrantsService } from "../application/services/cli-agent-grants.service";
import { SsoService } from "../application/services/sso.service";
import { SsoSessionService } from "../application/services/sso-session.service";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { PrismaCliGrantLock } from "../infrastructure/adapters/prisma-cli-grant-lock.adapter";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "../infrastructure/adapters/prisma-user-repository.adapter";
import {
  createSsoTestContext,
  ssoTestOrigins as origins,
  ssoTestProxyKey,
} from "../testkit/sso-test-context";

describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("CLI agent grants", () => {
  it("binds a grant to the prepared credential, scope, current authority and lifetime", async () => {
    const fixture = await createSsoTestContext(origins, false, true, true);
    const workspaces = new PrismaWorkspaceRepository(fixture.prisma);
    const workspaceAuth = new AuthorizeWorkspaceUseCase(workspaces);
    const memberships = new PrismaMembershipRepository(fixture.prisma);
    const sessions = new SsoSessionService(
      fixture.registrations,
      fixture.store,
      fixture.crypto,
      fixture.clock,
      memberships,
      new PrismaTenantRepository(fixture.prisma),
      new AuthorizeRequestContextUseCase(memberships, workspaceAuth),
      new PrismaUserRepository(fixture.prisma)
    );
    const grants = new CliAgentGrantsService(
      fixture.registrations,
      fixture.service,
      sessions,
      workspaceAuth,
      new PrismaExtKvAdapter(fixture.prisma),
      new PrismaCliGrantLock(fixture.prisma),
      new PrismaUnitOfWork(fixture.prisma),
      fixture.audit,
      fixture.clock
    );
    const module = await Test.createTestingModule({
      controllers: [CliAgentController, CliSsoController],
      providers: [
        { provide: CliAgentGrantsService, useValue: grants },
        { provide: SsoService, useValue: fixture.service },
        { provide: SsoSessionService, useValue: sessions },
        {
          provide: SsoHttpSecurity,
          useValue: new SsoHttpSecurity(fixture.registrations, fixture.crypto),
        },
        { provide: ListWorkspacesUseCase, useValue: new ListWorkspacesUseCase(workspaces) },
      ],
    }).compile();
    const app = module.createNestApplication({ bodyParser: false, logger: false });
    configureSsoHttpTransport(app);
    await app.init();
    const client = request(app.getHttpServer());
    const ingress = {
      "x-corely-sso-origin": origins.login,
      "x-corely-sso-proxy-key": ssoTestProxyKey,
      Accept: "application/json",
    };
    const tenantId = fixture.tenantId;
    try {
      const legal = await fixture.prisma.legalEntity.create({
        data: {
          tenantId,
          kind: "COMPANY",
          legalName: "Studio Demo",
          countryCode: "DE",
          currency: "EUR",
        },
      });
      const [workspace, neighbor] = await Promise.all(
        ["Berlin Mitte", "Berlin West"].map((name) =>
          fixture.prisma.workspace.create({ data: { tenantId, name, legalEntityId: legal.id } })
        )
      );
      const membership = await fixture.prisma.workspaceMembership.create({
        data: { workspaceId: workspace.id, userId: fixture.userId, role: "OWNER" },
      });
      await fixture.prisma.workspaceMembership.create({
        data: { workspaceId: neighbor.id, userId: fixture.userId, role: "OWNER" },
      });
      const login = await fixture.login();
      const verifier = fixture.crypto.secret();
      const state = fixture.crypto.secret();
      const port = 43124;
      const start = await fixture.service.startCli(
        { port, state, challenge: fixture.crypto.challenge(verifier) },
        "synthetic"
      );
      const requestId = new URL(start.redirectTo).searchParams.get("request")!;
      const { csrfToken } = await fixture.service.cliConsent(requestId, login.centralHandle);
      const consent = await fixture.service.cliConsent(requestId, login.centralHandle, csrfToken);
      const manager = await fixture.service.exchangeCli({
        request: requestId,
        code: new URL(consent.redirectTo).searchParams.get("code")!,
        state,
        verifier,
        port,
      });

      const scope = { tenantId, workspaceId: workspace.id };
      function prepare() {
        const agentId = randomUUID();
        const secret = fixture.crypto.secret();
        return {
          secret,
          credential: `Bearer corely-agent.${agentId}.${secret}`,
          grant: {
            ...scope,
            agentId,
            name: "Synthetic agent",
            durationMinutes: 1,
            operations: ["workspace.describe"],
            fingerprint: createHash("sha256")
              .update(cliAgentProof(scope, agentId, secret))
              .digest("hex"),
          },
        };
      }
      const issue = (body: unknown) =>
        client
          .post("/sso/cli/grants")
          .set(ingress)
          .set("Authorization", `Bearer ${manager.accessToken}`)
          .send(body);
      const agent = prepare();
      const discovery = (credential: string, target = scope) =>
        client
          .get("/sso/cli/capabilities")
          .set(ingress)
          .set("Authorization", credential)
          .query(target);
      const run = (operation: string, input = {}) =>
        client
          .post(`/sso/cli/operations/${operation}`)
          .set(ingress)
          .set("Authorization", agent.credential)
          .send({ ...scope, input });
      await issue({ ...agent.grant, operations: ["approvals.approve"] }).expect(400);
      const issued = await issue(agent.grant).expect(201);
      expect(issued.body).toMatchObject({
        agentId: agent.grant.agentId,
        workspaceId: workspace.id,
        revokedAt: null,
      });
      expect(issued.body).not.toHaveProperty("fingerprint");
      expect(issued.text).not.toContain(agent.secret);
      expect((await discovery(agent.credential).expect(200)).body).toEqual([
        expect.objectContaining({ id: "workspace.describe", inputSchema: expect.any(Object) }),
      ]);
      expect((await run("workspace.describe").expect(200)).body).toEqual({
        ...scope,
        name: "Berlin Mitte",
      });
      await discovery(agent.credential, { ...scope, workspaceId: neighbor.id }).expect(401);
      await discovery(agent.credential, { ...scope, tenantId: "different-tenant" }).expect(401);
      await discovery(`Bearer ${manager.accessToken}`).expect(401);
      await run("workspace.describe", { workspaceId: neighbor.id }).expect(400);
      await run("approvals.approve").expect(403);
      await client
        .get("/sso/cli/account")
        .set(ingress)
        .set("Authorization", agent.credential)
        .expect(401);
      await client
        .post("/sso/cli/grants")
        .set(ingress)
        .set("Authorization", agent.credential)
        .send(agent.grant)
        .expect(401);
      await fixture.prisma.workspaceMembership.update({
        where: { id: membership.id },
        data: { role: "MEMBER" },
      });
      await discovery(agent.credential).expect(403);
      await fixture.prisma.workspaceMembership.update({
        where: { id: membership.id },
        data: { role: "OWNER" },
      });
      const revoked = await client
        .post(`/sso/cli/grants/${agent.grant.agentId}/revoke`)
        .set(ingress)
        .set("Authorization", `Bearer ${manager.accessToken}`)
        .send(scope)
        .expect(200);
      expect(revoked.body.revokedAt).toEqual(expect.any(String));
      await discovery(agent.credential).expect(401);
      await issue(agent.grant).expect(409);
      const expiring = prepare();
      await issue(expiring.grant).expect(201);
      await discovery(expiring.credential).expect(200);
      fixture.advance(61_000);
      await discovery(expiring.credential).expect(401);
      const history = await fixture.prisma.auditLog.findMany({
        where: { tenantId, action: { startsWith: "identity.cli_agent." } },
      });
      expect(history.map((entry) => entry.action)).toEqual(
        expect.arrayContaining([
          "identity.cli_agent.issued",
          "identity.cli_agent.discovered",
          "identity.cli_agent.executed",
          "identity.cli_agent.revoked",
        ])
      );
      expect(JSON.stringify(history)).not.toContain(agent.secret);
      expect(JSON.stringify(history)).not.toContain(agent.grant.fingerprint);
    } finally {
      await app.close();
      await fixture.prisma.extKv.deleteMany({
        where: { tenantId, moduleId: "identity-cli-agent-grants" },
      });
      await fixture.prisma.workspace.deleteMany({ where: { tenantId } });
      await fixture.cleanup();
    }
  }, 15_000);
});
