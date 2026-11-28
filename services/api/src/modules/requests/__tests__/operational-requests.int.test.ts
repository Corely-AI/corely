import { randomUUID } from "node:crypto";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  WorkflowDefinitionRepository,
} from "@corely/data";
import type { EnvService } from "@corely/config";
import type { UseCaseContext } from "@corely/kernel";
import { NotFoundError, err } from "@corely/kernel";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { Test } from "@nestjs/testing";
import type { ExecutionContext } from "@nestjs/common";
import supertest from "supertest";
import type { ContextAwareRequest } from "../../../shared/request-context";
import { ApprovalPolicyService } from "../../approvals/public";
import { PrismaApprovalPolicyRepository } from "../../approvals/infrastructure/repositories/prisma-approval-policy-repository";
import { DocumentsApplication } from "../../documents/public";
import { OperationalRequestDocumentsAdapter } from "../../documents/infrastructure/prisma/operational-request-documents.adapter";
import { PrivateEmailOriginalsAdapter } from "../../documents/infrastructure/prisma/private-email-originals.adapter";
import { PrismaDocumentRepoAdapter } from "../../documents/infrastructure/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "../../documents/infrastructure/prisma/prisma-file-repo.adapter";
import { FakeObjectStoragePort } from "../../documents/testkit/fakes/fake-object-storage";
import { GetWorkspacePermissionsUseCase } from "../../identity/public";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { ProceduresUseCase } from "../../knowledge/application/procedures.usecase";
import { ExtProcedureRepository } from "../../knowledge/infrastructure/ext-procedure-repository.adapter";
import { StaffOperationsLookup } from "../../people/public";
import { TenantEntitlementService } from "../../platform/public";
import { ExtOperationalRequestRepository } from "../infrastructure/ext-operational-request-repository";
import { OperationalRequestsUseCase } from "../application/operational-requests.usecase";
import { OperationalRequestsController } from "../adapters/http/operational-requests.controller";

const database = process.env.OPERATIONAL_REQUEST_TEST_DATABASE_URL;
const ctx = (
  userId = "staff",
  workspaceId = "workspace-a",
  tenantId = "tenant-a"
): UseCaseContext => ({ tenantId, workspaceId, userId, roles: [], correlationId: "req-test" });
const absence = {
  kind: "ABSENCE",
  firstDay: "2026-12-03",
  lastDay: "2026-12-04",
  reason: "Private synthetic reason",
  policyDocumentId: null,
};
const equipment = {
  kind: "EQUIPMENT",
  item: "Headset",
  quantity: 2,
  justification: "Customer calls",
  policyDocumentId: null,
};
const general = {
  kind: "GENERAL",
  subject: "Training",
  details: "Attend a workshop",
  policyDocumentId: null,
};

describe.skipIf(!database)(
  "operational requests against disposable PostgreSQL",
  { timeout: 30000 },
  () => {
    let prisma: PrismaService;
    let usecase: OperationalRequestsUseCase;
    let repo: ExtOperationalRequestRepository;
    let approvals: ApprovalPolicyService;
    let procedures: ProceduresUseCase;
    const revokedKnowledge = new Set<string>();
    const reviewers = new Set(["reviewer"]);
    const policyLookup = vi.fn(async () => err(new NotFoundError("Document not found")));

    beforeAll(async () => {
      const url = new URL(database!);
      if (
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        !/^\/corely_309_test(?:_\w+)?$/.test(url.pathname)
      ) {
        throw new Error("Use a disposable local corely_309_test database");
      }
      process.env.DATABASE_URL = database;
      prisma = new PrismaService();
      await prisma.$connect();
      repo = new ExtOperationalRequestRepository(prisma, new PrismaExtKvAdapter(prisma));
      const permissions = {
        execute: async (context: UseCaseContext) => ({
          permissions: {
            allowAll: false,
            allowed: [
              "requests.read",
              ...(context.userId !== "read-only" ? ["requests.own.submit"] : []),
              ...(context.userId === "routing-admin" ? ["requests.routing.manage"] : []),
              ...(context.userId &&
              reviewers.has(context.userId) &&
              context.workspaceId === "workspace-a"
                ? ["requests.review"]
                : []),
              ...(context.userId === "document-reader" ? ["documents.read"] : []),
            ],
            denied: [],
          },
        }),
      } as GetWorkspacePermissionsUseCase;
      const entitlements = {
        getTenantEntitlement: async () => ({ isAppEnabled: () => true }),
      } as unknown as TenantEntitlementService;
      const staff = {
        lock: async () => undefined,
        forAccount: async (_: unknown, userId: string) => ({
          id: `profile-${userId}`,
          displayName: userId,
          archivedAt: null,
        }),
      } as StaffOperationsLookup;
      const documents = {
        getDocument: { execute: policyLookup },
      } as unknown as DocumentsApplication;
      const storage = new FakeObjectStoragePort();
      approvals = new ApprovalPolicyService(
        new PrismaApprovalPolicyRepository(new WorkflowDefinitionRepository(prisma))
      );
      procedures = new ProceduresUseCase(
        new ExtProcedureRepository(prisma, new PrismaExtKvAdapter(prisma)),
        { store: async () => undefined, read: async () => null },
        {
          execute: async (context) => ({
            permissions: {
              allowed:
                context.userId === "author"
                  ? ["knowledge.read", "knowledge.manage"]
                  : ["knowledge.read"],
              denied:
                context.userId && revokedKnowledge.has(context.userId) ? ["knowledge.read"] : [],
              allowAll: false,
            },
          }),
        },
        { isAppEnabled: async () => true },
        { findById: async () => null },
        new PrismaAuditAdapter(prisma),
        new PrismaOutboxAdapter(prisma)
      );
      usecase = new OperationalRequestsUseCase(
        repo,
        permissions,
        entitlements,
        staff,
        approvals,
        new OperationalRequestDocumentsAdapter(
          new PrivateEmailOriginalsAdapter(prisma, storage, {} as EnvService)
        ),
        documents,
        new PrismaAuditAdapter(prisma),
        new PrismaOutboxAdapter(prisma),
        procedures
      );
    });

    afterAll(async () => {
      if (!prisma) {
        return;
      }
      await prisma.file.deleteMany({
        where: { tenantId: "tenant-a", documentId: { startsWith: "req-file-" } },
      });
      await prisma.document.deleteMany({
        where: { tenantId: "tenant-a", id: { startsWith: "req-file-" } },
      });
      await prisma.extKv.deleteMany({ where: { tenantId: "tenant-a", moduleId: "requests" } });
      await prisma.extKv.deleteMany({ where: { tenantId: "tenant-a", moduleId: "knowledge" } });
      await prisma.workflowDefinition.deleteMany({
        where: { tenantId: "tenant-a", key: { startsWith: "approval.operational-request." } },
      });
      await prisma.auditLog.deleteMany({
        where: {
          tenantId: "tenant-a",
          OR: [{ action: { startsWith: "requests." } }, { action: { startsWith: "knowledge." } }],
        },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          tenantId: "tenant-a",
          OR: [
            { eventType: { startsWith: "requests." } },
            { eventType: { startsWith: "knowledge." } },
          ],
        },
      });
      await prisma.$disconnect();
    });

    const command = (
      action: Parameters<OperationalRequestsUseCase["command"]>[0],
      id: string,
      body: unknown,
      actor = ctx(),
      key = randomUUID().toString()
    ) => usecase.command(action, id, body, key, actor);

    it("links only authorized publications with request ownership, version and replay checks", async () => {
      const request = await command("create", "", general);
      const fields = {
        title: "Private procedure",
        reviewDate: "2030-01-01",
        content: { kind: "page", text: "Follow approved preparation steps." },
      };
      const author = ctx("author");
      const draft = await procedures.command("create", undefined, fields, randomUUID(), author);
      const input = { version: request.version, procedureId: draft.id };
      await expect(command("link-procedure", request.id, input)).rejects.toMatchObject({
        status: 404,
      });
      const published = await procedures.command(
        "publish",
        draft.id,
        { revision: draft.revision },
        randomUUID(),
        author
      );
      await expect(
        command("link-procedure", request.id, input, ctx("another"))
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        command("link-procedure", request.id, input, ctx("staff", "workspace-b"))
      ).rejects.toMatchObject({ status: 404 });
      const key = randomUUID();
      const [first, replay] = await Promise.all([
        command("link-procedure", request.id, input, ctx(), key),
        command("link-procedure", request.id, input, ctx(), key),
      ]);
      expect(replay).toEqual(first);
      expect(first.procedure).toEqual({ state: "available", id: draft.id });
      expect(JSON.stringify(first)).not.toContain(fields.title);
      expect(
        await prisma.auditLog.count({
          where: {
            tenantId: "tenant-a",
            entityId: request.id,
            action: "requests.operational.link-procedure",
          },
        })
      ).toBe(1);
      expect(
        await prisma.outboxEvent.count({
          where: {
            tenantId: "tenant-a",
            eventType: "requests.operational.link-procedure",
            payloadJson: { contains: request.id },
          },
        })
      ).toBe(1);
      await expect(command("link-procedure", request.id, input)).rejects.toMatchObject({
        status: 409,
      });
      revokedKnowledge.add("staff");
      try {
        expect((await usecase.detail(request.id, ctx())).procedure).toEqual({
          state: "unavailable",
        });
        expect((await command("link-procedure", request.id, input, ctx(), key)).procedure).toEqual({
          state: "unavailable",
        });
      } finally {
        revokedKnowledge.delete("staff");
      }
      await procedures.command(
        "archive",
        draft.id,
        { revision: published.revision },
        randomUUID(),
        author
      );
      expect((await usecase.detail(request.id, ctx())).procedure).toEqual({ state: "unavailable" });
      expect(
        (await command("link-procedure", request.id, { version: first.version, procedureId: null }))
          .procedure
      ).toBeNull();
      expect((await command("link-procedure", request.id, input, ctx(), key)).procedure).toBeNull();
    });

    it("serves the authorized link command over HTTP through the owning use case", async () => {
      const draftRequest = await command("create", "", general);
      const author = ctx("author");
      const draft = await procedures.command(
        "create",
        undefined,
        {
          title: "Workspace opening",
          reviewDate: "2030-01-01",
          content: { kind: "page", text: "Check the equipment." },
        },
        randomUUID(),
        author
      );
      await procedures.command(
        "publish",
        draft.id,
        { revision: draft.revision },
        randomUUID(),
        author
      );
      const module = await Test.createTestingModule({
        controllers: [OperationalRequestsController],
        providers: [{ provide: OperationalRequestsUseCase, useValue: usecase }],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate(execution: ExecutionContext) {
            const req = execution.switchToHttp().getRequest<ContextAwareRequest>();
            if (req.headers.authorization !== "Bearer fixture-staff") {
              return false;
            }
            req.user = { userId: "staff", tenantId: "tenant-a", workspaceId: "workspace-a" };
            return true;
          },
        })
        .compile();
      const api = module.createNestApplication();
      await api.init();
      try {
        const endpoint = `/operational-requests/${draftRequest.id}/procedure`;
        const input = { version: draftRequest.version, procedureId: draft.id };
        const key = randomUUID();
        const send = () =>
          supertest(api.getHttpServer()).patch(endpoint).set("X-Idempotency-Key", key).send(input);
        await send().expect(403);
        const link = await send()
          .set("Authorization", "Bearer fixture-staff")
          .set("X-Workspace-Id", "workspace-a")
          .expect(200);
        expect(link.headers["cache-control"]).toContain("no-store");
        expect(link.body.procedure).toEqual({ state: "available", id: draft.id });
      } finally {
        await api.close();
      }
    });

    it("preserves drafts through missing routing, selects a configured active reviewer and rejects invalid or self routing", async () => {
      const draft = await command("create", "", absence);
      await expect(command("submit", draft.id, { version: 1 })).rejects.toMatchObject({
        response: { code: "REQUEST_REVIEWER_UNAVAILABLE" },
      });
      expect(await usecase.detail(draft.id, ctx())).toEqual(draft);
      await expect(
        usecase.configureRoute("ABSENCE", { reviewerUserId: "reviewer" }, randomUUID(), ctx())
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        usecase.configureRoute(
          "ABSENCE",
          { reviewerUserId: "reviewer" },
          randomUUID(),
          ctx("routing-admin", "workspace-b")
        )
      ).rejects.toMatchObject({ status: 400 });

      const admin = ctx("routing-admin");
      const key = randomUUID();
      const approval = await usecase.configureRoute(
        "ABSENCE",
        { reviewerUserId: "reviewer" },
        key,
        admin
      );
      await expect(
        usecase.configureRoute("ABSENCE", { reviewerUserId: "reviewer" }, key, admin)
      ).resolves.toEqual(approval);
      await expect(
        usecase.configureRoute("ABSENCE", { reviewerUserId: "someone-else" }, key, admin)
      ).rejects.toMatchObject({ status: 409 });

      const own = await command("create", "", absence, ctx("reviewer"));
      await expect(
        command("submit", own.id, { version: 1 }, ctx("reviewer"))
      ).rejects.toMatchObject({ response: { code: "REQUEST_REVIEWER_UNAVAILABLE" } });
      reviewers.delete("reviewer");
      await expect(command("submit", draft.id, { version: 1 })).rejects.toMatchObject({
        response: { code: "REQUEST_REVIEWER_UNAVAILABLE" },
      });
      reviewers.add("reviewer");
      const submitted = await command("submit", draft.id, { version: 1 });
      expect(submitted).toMatchObject({ id: draft.id, status: "SUBMITTED" });
      expect(submitted).not.toHaveProperty("approval");
      const selected = (
        await repo.get({ tenantId: "tenant-a", workspaceId: "workspace-a" }, draft.id)
      )?.approval;
      expect(selected).toMatchObject({ reviewerUserId: "reviewer", policyId: expect.any(String) });
      await expect(approvals.getPolicy("tenant-a", selected!.policyId)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        approvals.setPolicyStatus("tenant-a", selected!.policyId, "INACTIVE")
      ).rejects.toMatchObject({ status: 404 });
      expect((await approvals.listPolicies("tenant-a")).map(({ id }) => id)).not.toContain(
        selected!.policyId
      );
      expect(await usecase.canRead(draft.id, ctx())).toBe(true);
      expect(await usecase.canRead(draft.id, ctx("reviewer"))).toBe(false);
    });

    it("serializes duplicate submits and withdrawals, retains history and keeps private fields out of audit and outbox", async () => {
      await usecase.configureRoute(
        "EQUIPMENT",
        { reviewerUserId: "reviewer" },
        randomUUID(),
        ctx("routing-admin")
      );
      const draft = await command("create", "", equipment);
      const key = randomUUID();
      const results = await Promise.all([
        command("submit", draft.id, { version: 1 }, ctx(), key),
        command("submit", draft.id, { version: 1 }, ctx(), key),
      ]);
      expect(results[0]).toEqual(results[1]);
      await expect(
        command("update", draft.id, { version: 2, draft: { ...equipment, quantity: 1 } })
      ).rejects.toMatchObject({ status: 409 });
      const withdrawKey = randomUUID();
      const withdrawn = await command("withdraw", draft.id, { version: 2 }, ctx(), withdrawKey);
      expect(await command("withdraw", draft.id, { version: 2 }, ctx(), withdrawKey)).toEqual(
        withdrawn
      );
      expect(await command("submit", draft.id, { version: 1 }, ctx(), key)).toEqual(results[0]);
      expect(await usecase.detail(draft.id, ctx())).toMatchObject({
        status: "WITHDRAWN",
        version: 3,
        draft: equipment,
      });
      const audit = await prisma.auditLog.findMany({
        where: { tenantId: "tenant-a", entityId: draft.id },
      });
      const events = await prisma.outboxEvent.findMany({
        where: { tenantId: "tenant-a", payloadJson: { contains: draft.id } },
      });
      expect(audit.map(({ action }) => action).sort()).toEqual(
        ["create", "submit", "withdraw"].map((action) => `requests.operational.${action}`)
      );
      expect(events.map(({ eventType }) => eventType).sort()).toEqual([
        "requests.operational.submit",
        "requests.operational.withdraw",
      ]);
      expect(JSON.stringify({ audit, events })).not.toMatch(/Headset|Customer calls/);
    });

    it("isolates drafts, files and document references and accepts incomplete drafts only until submission", async () => {
      const draft = await command("create", "", { ...general, details: "" });
      await expect(command("submit", draft.id, { version: 1 })).rejects.toMatchObject({
        issues: [expect.objectContaining({ path: ["details"] })],
      });
      await expect(
        command("create", "", { ...absence, firstDay: "2026-12-05" })
      ).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ["lastDay"] })] });
      const fileInput = {
        version: 1,
        name: "support.pdf",
        mediaType: "application/pdf",
        base64: Buffer.from("%PDF-1.7").toString("base64"),
      };
      const attached = await command("attach", draft.id, fileInput);
      const file = attached.attachments[0];
      expect(file).toBeDefined();
      const expectedId = file.id;
      expect(await usecase.download(draft.id, expectedId, ctx())).toMatchObject({
        url: expect.stringMatching(/^https:\/\/download\.test\//),
      });
      await expect(
        new PrismaDocumentRepoAdapter(prisma).findById("tenant-a", expectedId)
      ).resolves.toBeNull();
      await expect(
        new PrismaFileRepoAdapter(prisma).findByDocument("tenant-a", expectedId)
      ).resolves.toEqual([]);
      for (const actor of [
        ctx("staff-2"),
        ctx("staff", "workspace-b"),
        ctx("staff", "workspace-a", "tenant-b"),
      ]) {
        await expect(usecase.detail(draft.id, actor)).rejects.toMatchObject({ status: 404 });
        await expect(usecase.download(draft.id, expectedId, actor)).rejects.toMatchObject({
          status: 404,
        });
        expect((await usecase.list({}, actor)).items).toEqual([]);
      }
      await expect(usecase.download(draft.id, expectedId + "-other", ctx())).rejects.toMatchObject({
        status: 404,
      });
      const reads = policyLookup.mock.calls.length;
      await expect(
        command("create", "", { ...general, policyDocumentId: "other-document" })
      ).rejects.toMatchObject({ status: 400 });
      expect(policyLookup.mock.calls).toHaveLength(reads);
      await expect(
        command(
          "create",
          "",
          { ...general, policyDocumentId: "other-document" },
          ctx("document-reader")
        )
      ).rejects.toMatchObject({ status: 400 });
      expect(policyLookup.mock.calls).toHaveLength(reads + 1);
      await expect(command("create", "", general, ctx("read-only"))).rejects.toMatchObject({
        status: 403,
      });
    });
  }
);
