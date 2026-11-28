import { randomUUID } from "node:crypto";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  WorkflowDefinitionRepository,
} from "@corely/data";
import type { EnvService } from "@corely/config";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import { OperationalRequestReminderEvent, StaffProfileSchema } from "@corely/contracts";
import { NotFoundError, err } from "@corely/kernel";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { OperationalRequestReminderHandler } from "../../background/runtime/modules/outbox/operational-request-reminder.handler";
import { PublishNotificationUseCase } from "../../notifications/public";
import { PrismaNotificationRepository } from "../../notifications/infrastructure/prisma-notification.repository";
import { Test } from "@nestjs/testing";
import type { ExecutionContext } from "@nestjs/common";
import supertest from "supertest";
import type { ContextAwareRequest } from "../../../shared/request-context";
import { ApprovalPolicyService } from "../../approvals/public";
import { PrismaApprovalPolicyRepository } from "../../approvals/infrastructure/repositories/prisma-approval-policy-repository";
import { DocumentsApplication, type PersonnelDocumentsPort } from "../../documents/public";
import { OperationalRequestDocumentsAdapter } from "../../documents/infrastructure/prisma/operational-request-documents.adapter";
import { PrivateEmailOriginalsAdapter } from "../../documents/infrastructure/prisma/private-email-originals.adapter";
import { PrismaDocumentRepoAdapter } from "../../documents/infrastructure/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "../../documents/infrastructure/prisma/prisma-file-repo.adapter";
import { FakeObjectStoragePort } from "../../documents/testkit/fakes/fake-object-storage";
import {
  GetEffectivePermissionsUseCase,
  GetWorkspacePermissionsUseCase,
} from "../../identity/public";
import { StaffAbsenceUseCase, StaffOperationsLookup } from "../../people/public";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import { ExtStaffAbsenceAdapter } from "../../people/infrastructure/ext-staff-absence.adapter";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { ProceduresUseCase } from "../../knowledge/application/procedures.usecase";
import { ExtProcedureRepository } from "../../knowledge/infrastructure/ext-procedure-repository.adapter";
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
    let absenceRepo: ExtStaffAbsenceAdapter;
    let allowPeopleApply = false;
    let rejectApplicationCommit = false;
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
              ...(allowPeopleApply && context.userId === "reviewer"
                ? [
                    "people.directory.read",
                    "people.profile.manage",
                    "people.private.read",
                    "people.private.manage",
                  ]
                : []),
            ],
            denied: [],
          },
        }),
      } as GetWorkspacePermissionsUseCase;
      const entitlements = {
        getTenantEntitlement: async () => ({ isAppEnabled: () => true }),
        isAppEnabled: async () => true,
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
      const kv = new PrismaExtKvAdapter(prisma);
      const staffRepo = new ExtStaffRepositoryAdapter(prisma, kv);
      absenceRepo = new ExtStaffAbsenceAdapter(prisma, kv);
      const scope = { tenantId: "tenant-a", workspaceId: "workspace-a" };
      await staffRepo.transaction(scope, (tx) =>
        staffRepo.save(
          scope,
          StaffProfileSchema.parse({
            id: "profile-staff",
            workspaceId: scope.workspaceId,
            displayName: "Synthetic Staff",
            accountId: "staff",
            version: 1,
            archivedAt: null,
            createdAt: "2026-11-01T09:00:00Z",
            updatedAt: "2026-11-01T09:00:00Z",
          }),
          tx
        )
      );
      const audit = new PrismaAuditAdapter(prisma);
      const databaseOutbox = new PrismaOutboxAdapter(prisma);
      const outbox: OutboxPort = {
        async enqueue(event, tx) {
          if (rejectApplicationCommit && event.eventType === "requests.operational.apply") {
            rejectApplicationCommit = false;
            throw new Error("Synthetic failure after the People write");
          }
          await databaseOutbox.enqueue(event, tx);
        },
      };
      const absences = new StaffAbsenceUseCase(
        staffRepo,
        absenceRepo,
        permissions as unknown as GetEffectivePermissionsUseCase,
        entitlements,
        { lock: async () => undefined, commitments: async () => [] },
        {} as PersonnelDocumentsPort,
        audit,
        outbox,
        { now: () => new Date("2026-11-28T12:00:00Z") }
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
        audit,
        outbox,
        absences,
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
      await prisma.extKv.deleteMany({
        where: { tenantId: "tenant-a", moduleId: { in: ["requests", "people", "knowledge"] } },
      });
      await prisma.workflowDefinition.deleteMany({
        where: { tenantId: "tenant-a", key: { startsWith: "approval.operational-request." } },
      });
      await prisma.auditLog.deleteMany({
        where: {
          tenantId: "tenant-a",
          OR: [
            { action: { startsWith: "requests." } },
            { action: { startsWith: "people.absence." } },
            { action: { startsWith: "knowledge." } },
          ],
        },
      });
      await prisma.notification.deleteMany({
        where: { tenantId: "tenant-a", type: "requests.review-reminder" },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          tenantId: "tenant-a",
          OR: [
            { eventType: { startsWith: "requests." } },
            { eventType: { startsWith: "people.absence." } },
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
      expect(await usecase.canRead(draft.id, ctx("reviewer"))).toBe(true);
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
        OperationalRequestReminderEvent,
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

    it("enforces assigned reviewer and current version while preserving return and resubmission history", async () => {
      const administrator = ctx("routing-admin");
      const reviewer = ctx("reviewer");
      await usecase.configureRoute(
        "GENERAL",
        { reviewerUserId: "reviewer" },
        randomUUID(),
        administrator
      );
      const draft = await command("create", "", general);
      const submitted = await command("submit", draft.id, { version: 1 });
      expect((await usecase.detail(draft.id, reviewer)).actions).toMatchObject({
        canEdit: false,
        canWithdraw: false,
        canDecide: true,
      });
      await expect(
        usecase.decide(draft.id, { version: 2, decision: "APPROVE" }, randomUUID(), ctx())
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        usecase.decide(draft.id, { version: 2, decision: "APPROVE" }, randomUUID(), administrator)
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        usecase.decide(draft.id, { version: 1, decision: "APPROVE" }, randomUUID(), reviewer)
      ).rejects.toMatchObject({ status: 409 });

      reviewers.delete("reviewer");
      await expect(
        usecase.decide(draft.id, { version: 2, decision: "APPROVE" }, randomUUID(), reviewer)
      ).rejects.toMatchObject({ status: 404 });
      reviewers.add("reviewer");

      const returnInput = {
        version: submitted.version,
        decision: "RETURN",
        note: "Please add the agenda.",
      };
      const key = randomUUID();
      const [returned, replayed] = await Promise.all([
        usecase.decide(draft.id, returnInput, key, reviewer),
        usecase.decide(draft.id, returnInput, key, reviewer),
      ]);
      expect(returned).toEqual(replayed);
      expect(returned.status).toBe("RETURNED");
      expect((await usecase.detail(draft.id, ctx())).actions?.canEdit).toBe(true);
      const updated = await command("update", draft.id, {
        version: returned.version,
        draft: { ...general, details: "Attend the workshop and send notes." },
      });
      const resubmitted = await command("submit", draft.id, { version: updated.version });
      await expect(
        usecase.decide(
          draft.id,
          { version: submitted.version, decision: "APPROVE" },
          randomUUID(),
          reviewer
        )
      ).rejects.toMatchObject({ status: 409 });
      const result = await usecase.decide(
        draft.id,
        { version: resubmitted.version, decision: "REJECT", note: "Already covered by training." },
        randomUUID(),
        reviewer
      );
      expect(result.status).toBe("REJECTED");
      expect(result.application).toBeNull();
      expect(result.review.map(({ action }) => action)).toEqual([
        "SUBMIT",
        "RETURN",
        "SUBMIT",
        "REJECT",
      ]);
      expect(result.review.filter(({ note }) => note).map(({ note }) => note)).toEqual([
        "Please add the agenda.",
        "Already covered by training.",
      ]);
      await expect(
        command("withdraw", draft.id, { version: result.version })
      ).rejects.toMatchObject({ status: 409 });
    });

    it("keeps approval distinct from application and retries an atomic People handoff without duplicate absence", async () => {
      const reviewer = ctx("reviewer");
      const scope = { tenantId: "tenant-a", workspaceId: "workspace-a" };
      const dstDay = "2030-03-31";
      await usecase.configureRoute(
        "ABSENCE",
        { reviewerUserId: "reviewer" },
        randomUUID(),
        ctx("routing-admin")
      );
      const draft = await command("create", "", { ...absence, firstDay: dstDay, lastDay: dstDay });
      const submitted = await command("submit", draft.id, { version: draft.version });
      const approved = await usecase.decide(
        draft.id,
        { version: submitted.version, decision: "APPROVE" },
        randomUUID(),
        reviewer
      );
      expect(approved).toMatchObject({ status: "APPROVED", application: { status: "PENDING" } });
      expect(await absenceRepo.list(scope, "profile-staff")).toEqual([]);

      const input = { version: approved.version, timezone: "Europe/Berlin" };
      const deniedKey = randomUUID();
      const blocked = await usecase.applyApprovedAbsence(draft.id, input, deniedKey, reviewer);
      expect(blocked).toMatchObject({
        application: { status: "FAILED", failure: "REJECTED_BY_PEOPLE" },
      });
      expect(await usecase.applyApprovedAbsence(draft.id, input, deniedKey, reviewer)).toEqual(
        blocked
      );

      allowPeopleApply = true;
      rejectApplicationCommit = true;
      const rollback = await usecase.applyApprovedAbsence(
        draft.id,
        { ...input, version: blocked.version },
        randomUUID(),
        reviewer
      );
      expect(rollback).toMatchObject({
        application: { status: "FAILED", failure: "TEMPORARILY_UNAVAILABLE" },
      });
      expect(await absenceRepo.list(scope, "profile-staff")).toEqual([]);

      const retry = { ...input, version: rollback.version };
      const key = randomUUID();
      const [applied, replayed] = await Promise.all([
        usecase.applyApprovedAbsence(draft.id, retry, key, reviewer),
        usecase.applyApprovedAbsence(draft.id, retry, key, reviewer),
      ]);
      expect(applied).toEqual(replayed);
      expect(applied).toMatchObject({ status: "APPROVED", application: { status: "APPLIED" } });
      const records = await absenceRepo.list(scope, "profile-staff");
      expect(records).toHaveLength(1);
      expect((await repo.get(scope, draft.id))?.applicationAbsenceId).toBe(records[0].id);
      expect(applied).not.toHaveProperty("applicationAbsenceId");
      expect(records[0].revisions[0]).toMatchObject({
        startAt: "2030-03-30T23:00:00.000Z",
        endAt: "2030-03-31T22:00:00.000Z",
        changedBy: "reviewer",
        reason: absence.reason,
      });
      expect(
        await prisma.outboxEvent.count({
          where: { tenantId: "tenant-a", eventType: "people.absence.changed" },
        })
      ).toBe(1);
      await expect(
        usecase.applyApprovedAbsence(draft.id, retry, randomUUID(), reviewer)
      ).rejects.toMatchObject({ status: 409 });
    });

    it("counts visible queue records and distinguishes missing policies from empty filters", async () => {
      const actor = ctx("queue-requester");
      const reviewer = ctx("queue-reviewer");
      reviewers.add("queue-reviewer");
      try {
        await usecase.configureRoute(
          "GENERAL",
          { reviewerUserId: "queue-reviewer" },
          randomUUID(),
          ctx("routing-admin")
        );
        const draft = await command("create", "", general, actor);
        const submitted = await command("submit", draft.id, { version: draft.version }, actor);
        await command("create", "", general, actor);
        const mine = await usecase.list({ status: "SUBMITTED" }, actor);
        expect(mine).toMatchObject({
          counts: { DRAFT: 1, SUBMITTED: 1 },
          total: 1,
          canReview: false,
          items: [
            {
              id: draft.id,
              kind: "GENERAL",
              queueStatus: "SUBMITTED",
              ageSeconds: expect.any(Number),
            },
          ],
        });
        expect(JSON.stringify(mine)).not.toContain(general.details);
        const inbox = await usecase.inbox({}, reviewer);
        expect(inbox).toMatchObject({
          counts: { SUBMITTED: 1 },
          total: 1,
          sourceUnavailable: false,
          items: [{ id: draft.id, kind: "GENERAL", queueStatus: "SUBMITTED" }],
        });
        expect(Object.keys(inbox.items[0]).sort()).toEqual(
          ["id", "kind", "status", "queueStatus", "submittedAt", "updatedAt", "ageSeconds"].sort()
        );
        await expect(usecase.inbox({}, ctx("queue-reviewer", "workspace-b"))).rejects.toMatchObject(
          { status: 403 }
        );
        await expect(usecase.inbox({}, actor)).rejects.toMatchObject({ status: 403 });
        await expect(
          usecase.inbox({ status: "FAILED_APPLICATION" }, reviewer)
        ).resolves.toMatchObject({
          counts: { SUBMITTED: 1 },
          total: 0,
          items: [],
        });
        const record = await repo.get(
          { tenantId: "tenant-a", workspaceId: "workspace-a" },
          submitted.id
        );
        if (!record?.approval) {
          throw new Error("Synthetic submitted request is missing its owner policy");
        }
        await prisma.workflowDefinition.update({
          where: { id: record.approval.policyId },
          data: { status: "INACTIVE" },
        });
        await expect(usecase.inbox({}, reviewer)).resolves.toMatchObject({
          counts: {},
          total: 0,
          items: [],
          sourceUnavailable: true,
        });
        await expect(usecase.detail(draft.id, reviewer)).rejects.toMatchObject({ status: 404 });
        await expect(usecase.detail(draft.id, actor)).resolves.toMatchObject({
          version: submitted.version,
        });
        reviewers.delete("queue-reviewer");
        await expect(usecase.inbox({}, reviewer)).rejects.toMatchObject({ status: 403 });
      } finally {
        reviewers.delete("queue-reviewer");
      }
    });

    it("schedules and delivers one neutral reminder and cancels overdue versions after decisions or revocation", async () => {
      const actor = ctx("reminder-requester");
      const reviewerUserId = "reminder-reviewer";
      const reviewer = ctx(reviewerUserId);
      const handler = new OperationalRequestReminderHandler(
        usecase,
        new PublishNotificationUseCase(new PrismaNotificationRepository(prisma))
      );
      const remindersFor = (requestId: string) =>
        prisma.outboxEvent.findMany({
          where: {
            tenantId: "tenant-a",
            eventType: OperationalRequestReminderEvent,
            payloadJson: { contains: requestId },
          },
        });
      async function submit() {
        const draft = await command("create", "", general, actor);
        const key = randomUUID();
        const [first, replay] = await Promise.all([
          usecase.command("submit", draft.id, { version: draft.version }, key, actor),
          usecase.command("submit", draft.id, { version: draft.version }, key, actor),
        ]);
        expect(first).toEqual(replay);
        const [queued, duplicate] = await remindersFor(first.id);
        expect(duplicate).toBeUndefined();
        expect(JSON.parse(queued.payloadJson)).toEqual({
          requestId: first.id,
          workspaceId: "workspace-a",
          version: first.version,
        });
        expect(queued.availableAt.getTime()).toBe(Date.parse(first.submittedAt!) + 86_400_000);
        return {
          request: first,
          event: {
            id: queued.id,
            tenantId: "tenant-a",
            eventType: queued.eventType,
            payload: JSON.parse(queued.payloadJson),
          },
        };
      }
      reviewers.add(reviewerUserId);
      try {
        await usecase.configureRoute(
          "GENERAL",
          { reviewerUserId },
          randomUUID(),
          ctx("routing-admin")
        );
        const eligible = await submit();
        await Promise.all([handler.handle(eligible.event), handler.handle(eligible.event)]);
        const reviewThenCancel = await submit();
        await usecase.decide(
          reviewThenCancel.request.id,
          {
            version: reviewThenCancel.request.version,
            decision: "RETURN",
            note: "Add context",
          },
          randomUUID(),
          reviewer
        );
        await handler.handle(reviewThenCancel.event);
        const revoked = await submit();
        reviewers.delete(reviewerUserId);
        await handler.handle(revoked.event);
        const delivered = await prisma.notification.findMany({
          where: {
            tenantId: "tenant-a",
            workspaceId: "workspace-a",
            type: "requests.review-reminder",
          },
          include: { recipients: true },
        });
        expect(delivered).toHaveLength(1);
        expect(delivered[0]).toMatchObject({
          title: "A request awaits review",
          dedupeKey: `requests.review:${eligible.request.id}:${eligible.request.version}`,
          resource: { url: "/requests/inbox" },
          recipients: [{ userId: reviewerUserId }],
        });
        expect(JSON.stringify(delivered)).not.toContain(general.details);
        await expect(usecase.detail(eligible.request.id, actor)).resolves.toMatchObject({
          status: "SUBMITTED",
        });
      } finally {
        reviewers.delete(reviewerUserId);
      }
    });
  }
);
