import { createHash, randomUUID } from "node:crypto";
import { cliAgentProof, StaffProfileSchema } from "@corely/contracts";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaUnitOfWork,
} from "@corely/data";
import { mockDeep } from "vitest-mock-extended";
import { CliOperationAccess } from "../adapters/http/cli-operation-access";
import { GetEffectivePermissionsUseCase } from "../application/use-cases/get-effective-permissions.usecase";
import { PrismaRolePermissionGrantRepository } from "../infrastructure/adapters/prisma-role-permission-grant-repository.adapter";
import { StaffOperationsLookup } from "../../people/public";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import { TenantEntitlementService } from "../../platform/public";
import { EmployeeTasksUseCase } from "../../tasks/public";
import { ExtTaskRepositoryAdapter } from "../../tasks/infrastructure/ext-task-repository.adapter";
import { CliTaskController } from "../../tasks/adapters/http/cli-task.controller";
import { CliAppointmentController } from "../../approvals/adapters/http/cli-appointment.controller";
import { AppointmentReviewUseCase } from "../../approvals/public/appointment-review";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { AuthorizeWorkspaceUseCase, ListWorkspacesUseCase } from "../../workspaces/public";
import { DailyOperationsBrief } from "../../operations-brief/application/daily-operations-brief";
import { CliDayBriefController } from "../../operations-brief/http/cli-day-brief.controller";
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
    const entitlements = mockDeep<TenantEntitlementService>();
    entitlements.isAppEnabled.mockResolvedValue(true);
    const permissions = new GetEffectivePermissionsUseCase(
      new PrismaRolePermissionGrantRepository(fixture.prisma),
      memberships,
      workspaceAuth
    );
    const kv = new PrismaExtKvAdapter(fixture.prisma);
    const staffRepo = new ExtStaffRepositoryAdapter(fixture.prisma, kv);
    const taskRepo = new ExtTaskRepositoryAdapter(fixture.prisma, kv);
    const tasks = new EmployeeTasksUseCase(
      taskRepo,
      permissions,
      new StaffOperationsLookup(staffRepo),
      entitlements,
      new PrismaAuditAdapter(fixture.prisma),
      new PrismaOutboxAdapter(fixture.prisma)
    );
    const security = new SsoHttpSecurity(fixture.registrations, fixture.crypto);
    const grants = new CliAgentGrantsService(
      fixture.registrations,
      fixture.service,
      sessions,
      workspaceAuth,
      new PrismaExtKvAdapter(fixture.prisma),
      new PrismaCliGrantLock(fixture.prisma),
      new PrismaUnitOfWork(fixture.prisma),
      fixture.audit,
      fixture.clock,
      permissions,
      entitlements
    );
    const brief = {
      execute: vi.fn(async (scope: { workspaceId: string }, date: string) => ({
        workspaceId: scope.workspaceId,
        date,
      })),
    };
    const reviews = mockDeep<AppointmentReviewUseCase>();
    const module = await Test.createTestingModule({
      controllers: [
        CliAgentController,
        CliSsoController,
        CliDayBriefController,
        CliTaskController,
        CliAppointmentController,
      ],
      providers: [
        { provide: CliAgentGrantsService, useValue: grants },
        {
          provide: CliOperationAccess,
          useValue: new CliOperationAccess(grants, sessions, security, workspaceAuth),
        },
        { provide: EmployeeTasksUseCase, useValue: tasks },
        { provide: AppointmentReviewUseCase, useValue: reviews },
        { provide: DailyOperationsBrief, useValue: brief },
        { provide: AuthorizeWorkspaceUseCase, useValue: workspaceAuth },
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
      const replacement = prepare();
      const proposal = {
        bookingId: randomUUID(),
        startAt: "2026-12-10T10:00:00+01:00",
        key: randomUUID(),
      };
      const requestReview = (action: string, body: Record<string, unknown>) =>
        client
          .post(`/sso/cli/appointments/${action}`)
          .set(ingress)
          .set("Authorization", replacement.credential)
          .send(body);
      await issue({ ...replacement.grant, operations: ["appointments.propose"] }).expect(201);
      await requestReview("apply", { ...scope, reviewId: "1".repeat(64) }).expect(403);
      await requestReview("decision", { ...scope, reviewId: "1".repeat(64) }).expect(404);
      await requestReview("propose", { ...scope, proposal }).expect(200);
      expect(reviews.proposeReplacement).toHaveBeenCalledWith(
        expect.objectContaining({
          ...scope,
          userId: fixture.userId,
          agentId: replacement.grant.agentId,
        }),
        { bookingId: proposal.bookingId, startAt: proposal.startAt },
        proposal.key,
        expect.any(Object)
      );
      await requestReview("propose", { ...scope, workspaceId: neighbor.id, proposal }).expect(401);
      entitlements.isAppEnabled.mockImplementation(async (_tenant, appId) => appId !== "booking");
      await requestReview("propose", { ...scope, proposal }).expect(403);
      entitlements.isAppEnabled.mockResolvedValue(true);
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
      const briefing = prepare();
      await issue({ ...briefing.grant, operations: ["day.brief"] }).expect(201);
      const day = (credential: string, target = scope) =>
        client
          .post("/sso/cli/day-brief")
          .set(ingress)
          .set("Authorization", credential)
          .send({ ...target, date: "today" });
      await day(agent.credential).expect(401);
      await day(briefing.credential, { ...scope, workspaceId: neighbor.id }).expect(401);
      const response = await day(briefing.credential).expect(200);
      expect(response.body).toEqual({ workspaceId: scope.workspaceId, date: "today" });
      await day(`Bearer ${manager.accessToken}`).expect(200);
      expect(brief.execute).toHaveBeenCalledTimes(2);
      await fixture.prisma.rolePermissionGrant.createMany({
        data: ["tasks.read", "tasks.manage"].map((permissionKey) => ({
          tenantId,
          roleId: fixture.membership.roleId,
          permissionKey,
          effect: "ALLOW" as const,
        })),
      });
      const ownerStaffId = randomUUID();
      const archivedStaffId = randomUUID();
      const foreignStaffId = randomUUID();
      const current = fixture.clock.now().toISOString();
      for (const [id, target, archivedAt] of [
        [ownerStaffId, scope, null],
        [archivedStaffId, scope, current],
        [foreignStaffId, { ...scope, workspaceId: neighbor.id }, null],
      ] as const) {
        await staffRepo.transaction(target, (tx) =>
          staffRepo.save(
            target,
            StaffProfileSchema.parse({
              id,
              workspaceId: target.workspaceId,
              displayName: "Lena",
              createdAt: current,
              updatedAt: current,
              version: 1,
              archivedAt,
            }),
            tx
          )
        );
      }
      const writer = prepare();
      await issue({ ...writer.grant, operations: ["tasks.create", "day.brief"] }).expect(201);
      const assigneeReader = prepare();
      await issue({ ...assigneeReader.grant, operations: ["tasks.assignees"] }).expect(201);
      const assigned = await client
        .post("/sso/cli/tasks/assignees")
        .set(ingress)
        .set("Authorization", assigneeReader.credential)
        .send(scope)
        .expect(200);
      expect(assigned.body).toEqual([{ id: ownerStaffId, displayName: "Lena" }]);
      await client
        .post("/sso/cli/tasks/assignees")
        .set(ingress)
        .set("Authorization", writer.credential)
        .send(scope)
        .expect(403);
      await day(writer.credential).expect(200);
      const task = {
        title: "Resolve coverage for the 14:00 appointment",
        ownerStaffId,
        dueAt: "2026-11-22T12:00:00+01:00",
        idempotencyKey: "one-follow-up",
      };
      const createTask = (token: string, change = {}) =>
        client
          .post("/sso/cli/tasks/create")
          .set(ingress)
          .set("Authorization", token)
          .send({ ...scope, task: { ...task, ...change } });
      await createTask(briefing.credential).expect(403);
      await createTask(assigneeReader.credential).expect(403);
      await createTask(writer.credential, { ownerStaffId: archivedStaffId }).expect(400);
      await createTask(writer.credential, { ownerStaffId: foreignStaffId }).expect(400);
      await createTask(writer.credential, { dueAt: "2026-11-22T12:00:00+99:00" }).expect(400);
      // First response is dropped by the caller. Retry makes the task ID observable.
      await createTask(writer.credential).expect(200);
      const recovered = await createTask(writer.credential).expect(200);
      expect(recovered.body).toMatchObject({
        status: "OPEN",
        ownerStaffId,
        dueAt: "2026-11-22T11:00:00.000Z",
      });
      expect(recovered.body.sourcePath).toBe(
        `/openbuk/app/tasks?taskId=${recovered.body.id}&workspaceId=${scope.workspaceId}`
      );
      await createTask(writer.credential, { title: "Different task" }).expect(409);
      const visible = await tasks.list(
        { taskId: recovered.body.id },
        { ...scope, userId: fixture.userId }
      );
      expect(visible.items).toEqual([
        expect.objectContaining({ id: recovered.body.id, title: task.title, ownerName: "Lena" }),
      ]);
      expect(await taskRepo.list(scope)).toHaveLength(1);
      const changes = await fixture.prisma.auditLog.findMany({
        where: { tenantId, action: "tasks.task.create", entityId: recovered.body.id },
      });
      expect(changes).toHaveLength(1);
      expect(changes[0].actorUserId).toBe(fixture.userId);
      expect(JSON.parse(changes[0].details ?? "{}")).toMatchObject({
        agentId: writer.grant.agentId,
        delegatorId: fixture.userId,
      });
      expect(
        await fixture.prisma.outboxEvent.count({
          where: {
            tenantId,
            eventType: "tasks.task.create",
            payloadJson: { contains: recovered.body.id },
          },
        })
      ).toBe(1);
      entitlements.isAppEnabled.mockImplementation(async (_tenant, id) => id !== "tasks");
      expect((await discovery(writer.credential).expect(200)).body.map(({ id }) => id)).toEqual([
        "day.brief",
      ]);
      await createTask(writer.credential).expect(403);
      entitlements.isAppEnabled.mockResolvedValue(true);
      await client
        .post(`/sso/cli/grants/${writer.grant.agentId}/revoke`)
        .set(ingress)
        .set("Authorization", `Bearer ${manager.accessToken}`)
        .send(scope)
        .expect(200);
      await createTask(writer.credential).expect(401);
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
        where: { tenantId, moduleId: { in: ["identity-cli-agent-grants", "tasks", "people"] } },
      });
      await fixture.prisma.outboxEvent.deleteMany({
        where: { tenantId, eventType: "tasks.task.create" },
      });
      await fixture.prisma.workspace.deleteMany({ where: { tenantId } });
      await fixture.cleanup();
    }
  }, 15_000);
});
