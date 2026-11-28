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
import { StaffProfileSchema } from "@corely/contracts";
import { NotFoundError, err } from "@corely/kernel";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
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
import { TenantEntitlementService } from "../../platform/public";
import { ExtOperationalRequestRepository } from "../infrastructure/ext-operational-request-repository";
import { OperationalRequestsUseCase } from "../application/operational-requests.usecase";

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
        absences
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
        where: { tenantId: "tenant-a", moduleId: { in: ["requests", "people"] } },
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
          ],
        },
      });
      await prisma.outboxEvent.deleteMany({
        where: {
          tenantId: "tenant-a",
          OR: [
            { eventType: { startsWith: "requests." } },
            { eventType: { startsWith: "people.absence." } },
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
  }
);
