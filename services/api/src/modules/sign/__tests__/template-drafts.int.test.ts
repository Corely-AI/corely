import {
  AcceptSignRequestUseCase,
  ArchiveSignTemplateUseCase,
  AttachSignTemplateSourceUseCase,
  CreateSignRequestDraftUseCase,
  DeclineSignRequestUseCase,
  DeliverSignInvitationUseCase,
  DownloadSignArtifactUseCase,
  ExchangeSignInvitationUseCase,
  ExpireSignRequestsUseCase,
  FinalizeSignRequestUseCase,
  GetSignRequestProgressUseCase,
  GetSignRequestUseCase,
  GetSignTemplateUseCase,
  ListSignRequestsUseCase,
  ListSignTemplatesUseCase,
  PreviewSignAcceptanceUseCase,
  PublishSignTemplateUseCase,
  ReadSignTemplateSourceUseCase,
  RemindSignRecipientUseCase,
  ReviewSignRequestUseCase,
  SaveRecipientProgressUseCase,
  SaveSignTemplateUseCase,
  SendSignRequestUseCase,
  VoidSignRequestUseCase,
} from "../application/use-cases";
import { RecipientSessionAccessService } from "../application/services/recipient-session-access.service";
import { SignRequestAccessService } from "../application/services/sign-request-access.service";
import { TemplateDraftAccessService } from "../application/services/template-draft-access.service";
import { TemplateRevisionWriter } from "../application/services/template-revision-writer.service";
import { SignAccessService } from "../application/services/sign-access.service";
import { CeremonyTransitionsService } from "../application/services/ceremony-transitions.service";
import { InvitationSecrets } from "../application/ports/invitation-secrets";
import { createGcsClient, GcsObjectStorageAdapter } from "@corely/storage";
import { restoreFixture } from "./restore-fixture";
import {
  PrismaFileRepoAdapter as BackgroundFiles,
  PrismaDocumentRepoAdapter as BackgroundDocuments,
} from "@corely/data";
import { unzipSync } from "fflate";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { X509Certificate } from "node:crypto";
import { PdfArtifactEngine } from "../infrastructure/pdf/pdf-artifact-engine";
import { NativeCoachingAgreements } from "../../coaching-engagements/public";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { PublicCeremonyController } from "../adapters/http/sign-ceremony.controller";
import { invitationSecrets } from "../infrastructure/invitation-vault";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { PrismaCeremonyRepository } from "../infrastructure/persistence/prisma-ceremony.repository";
import { PrismaRequestDraftRepository } from "../infrastructure/persistence/prisma-request-draft.repository";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { SignTemplatesController } from "../adapters/http/sign-templates.controller";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { ProblemDetailsExceptionFilter } from "../../../shared/exceptions/problem-details.filter";
import { inspectTemplatePdf } from "../infrastructure/pdf/inspect-template-pdf";
import { createHash, randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaService, PrismaUnitOfWork } from "@corely/data";
import { signFixture } from "./sign-fixture";
import { FeatureCatalogService } from "../../platform-entitlements/application/feature-catalog.service";
import { TenantEntitlementsService } from "../../platform-entitlements/application/tenant-entitlements.service";
import { TenantEntitlementsReadAdapter } from "../../platform-entitlements/adapters/tenant-entitlements-read.adapter";
import { TenantEntitlementService } from "../../platform/public";
import { EnableAppUseCase } from "../../platform/application/use-cases/enable-app.usecase";
import { DependencyResolverService } from "../../platform/application/services/dependency-resolver.service";
import { PrismaSignDraftRepository } from "../infrastructure/persistence/prisma-sign-draft.repository";
import { signAppManifest } from "../sign.manifest";

import { mockDeep } from "vitest-mock-extended";
import type { ObjectStoragePort } from "@corely/kernel";
import { PDFDocument } from "pdf-lib";
import { PrismaTemplateDocuments } from "../../documents/infrastructure/prisma/prisma-template-documents";
import { PrismaDocumentRepoAdapter } from "../../documents/infrastructure/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "../../documents/infrastructure/prisma/prisma-file-repo.adapter";
const url = process.env.SIGN_TEST_DATABASE_URL;
describe.skipIf(!url || !/^postgresql:\/\/[^/]+\/sign_test_[a-z0-9_]+$/.test(url))(
  "workspace template drafts (PostgreSQL)",
  () => {
    let db: PrismaService,
      f: Awaited<ReturnType<typeof signFixture>>,
      listSignTemplates: ListSignTemplatesUseCase,
      getSignTemplate: GetSignTemplateUseCase,
      saveSignTemplate: SaveSignTemplateUseCase,
      archiveSignTemplate: ArchiveSignTemplateUseCase,
      templateAccess: TemplateDraftAccessService,
      access: SignAccessService,
      settings: TenantEntitlementsService,
      entitlements: TenantEntitlementService;
    const id = randomUUID();
    const body = {
      expectedRevision: 0,
      title: "Synthetic template",
      layout: {
        schemaVersion: 1,
        document: { id: "original", sha256: "b".repeat(64), pageCount: 1 },
        roles: [{ id: "client", name: "Client" }],
        fields: [],
      },
    };
    beforeAll(async () => {
      process.env.DATABASE_URL = url;
      db = new PrismaService();
      f = await signFixture(db);
      const registry = {
        list: () => [signAppManifest],
        get: (key: string) => (key === "sign" ? signAppManifest : undefined),
        has: (key: string) => key === "sign",
        findByCapability: () => [signAppManifest],
      };
      const catalog = new FeatureCatalogService(registry);
      catalog.compileCatalog();
      const installer = new EnableAppUseCase(
        registry,
        f.appInstalls,
        new DependencyResolverService(),
        f.audit,
        { newId: randomUUID }
      );
      settings = new TenantEntitlementsService(db, catalog, installer, f.audit);
      entitlements = new TenantEntitlementService(
        f.appInstalls,
        registry,
        new TenantEntitlementsReadAdapter(settings)
      );
      access = new SignAccessService(f.permissions, entitlements);
      const drafts = new PrismaSignDraftRepository(db);
      templateAccess = new TemplateDraftAccessService(drafts, access);
      const revisions = new TemplateRevisionWriter(
        drafts,
        access,
        new PrismaUnitOfWork(db),
        f.audit,
        f.outbox
      );
      listSignTemplates = new ListSignTemplatesUseCase(drafts, access);
      getSignTemplate = new GetSignTemplateUseCase(templateAccess);
      saveSignTemplate = new SaveSignTemplateUseCase(revisions);
      archiveSignTemplate = new ArchiveSignTemplateUseCase(revisions);
      await db.rolePermissionGrant.create({
        data: {
          tenantId: f.tenantA,
          roleId: f.managerRole,
          permissionKey: "sign.templates.manage",
          effect: "ALLOW",
        },
      });
      await settings.updateAppEnablement(f.tenantA, "sign", true, f.manager);
    }, 30000);
    afterAll(async () => {
      if (f) {
        await db.coachingEngagement.deleteMany({ where: { tenantId: f.tenantA } });
        await db.coachingOffer.deleteMany({ where: { tenantId: f.tenantA } });
        await db.signReminder.deleteMany({ where: { tenantId: f.tenantA } });
        await db.signCeremonyRecipient.deleteMany({ where: { tenantId: f.tenantA } });
        await db.signCeremony.deleteMany({ where: { tenantId: f.tenantA } });
        await db.signRequestDraft.deleteMany({ where: { tenantId: f.tenantA } });
        await db.signTemplatePublication.deleteMany({ where: { tenantId: f.tenantA } });
        await db.document.deleteMany({
          where: { tenantId: f.tenantA, id: { startsWith: "sign-private-" } },
        });
        await db.signTemplateRevision.deleteMany({ where: { tenantId: f.tenantA } });
        await f.cleanup();
      }
      await db?.onModuleDestroy();
    });
    it("commits one revision, audit and event on a concurrent duplicate, rejects mismatching retries", async () => {
      const key = randomUUID();
      const result = await Promise.all([
        saveSignTemplate.execute(f.ctx, id, key, body),
        saveSignTemplate.execute(f.ctx, id, key, body),
      ]);
      expect(result[0]).toEqual(result[1]);
      expect(result[0].revision).toBe(1);
      await expect(
        saveSignTemplate.execute(f.ctx, id, key, { ...body, title: "Changed" })
      ).rejects.toThrow(/different changes/);
      expect(await db.signTemplateRevision.count({ where: { templateId: id } })).toBe(1);
      expect(await db.auditLog.count({ where: { tenantId: f.tenantA, entityId: id } })).toBe(1);
      expect(
        await db.outboxEvent.count({
          where: { tenantId: f.tenantA, eventType: "sign.template.draft_saved.v1" },
        })
      ).toBe(1);
      expect((await listSignTemplates.execute(f.ctx)).items[0]).toEqual({
        archived: false,
        templateId: id,
        title: body.title,
        revision: 1,
      });
    });
    it("keeps the preceding revision when concurrent edits race", async () => {
      const results = await Promise.allSettled(
        ["First", "Second"].map((title) =>
          saveSignTemplate.execute(f.ctx, id, randomUUID(), { ...body, expectedRevision: 1, title })
        )
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect((await getSignTemplate.execute(f.ctx, id)).revision).toBe(2);
      expect(
        (await db.signTemplateRevision.findFirst({ where: { templateId: id, revision: 1 } }))?.title
      ).toBe(body.title);
    });
    it(
      "round-trips exact original bytes, excludes generic downloads and detects changed storage",
      async () => {
        const objects = new Map<string, Buffer>();
        const host = process.env.SIGN_FIXTURE_STORAGE_URL;
        if (host && !/^http:\/\/127\.0\.0\.1:\d+$/.test(host))
          throw Error("Use a loopback storage emulator");
        const actual = host
          ? new GcsObjectStorageAdapter(
              createGcsClient({
                projectId: "sign-fixture",
                apiEndpoint: process.env.SIGN_FIXTURE_STORAGE_URL,
              }),
              "sign-fixture"
            )
          : null;
        const storage = mockDeep<ObjectStoragePort>();
        storage.provider.mockReturnValue("gcs");
        storage.bucket.mockReturnValue("test");
        storage.putObject.mockImplementation(async ({ objectKey, bytes }) => {
          if (actual)
            await actual.putObject({
              tenantId: f.tenantA,
              objectKey,
              contentType: "application/pdf",
              bytes,
            });
          objects.set(objectKey, bytes);
          return { sizeBytes: bytes.length };
        });
        storage.getObject.mockImplementation(async ({ objectKey }) => {
          if (actual) return actual.getObject({ tenantId: f.tenantA, objectKey });
          const bytes = objects.get(objectKey);
          if (!bytes) throw Error("missing");
          return bytes;
        });
        const adapter = new PrismaTemplateDocuments(db, storage, { STORAGE_KEY_PREFIX: "test" });
        const attachSignTemplateSource = new AttachSignTemplateSourceUseCase(
          adapter,
          { pageCount: inspectTemplatePdf },
          templateAccess
        );
        const readSignTemplateSource = new ReadSignTemplateSourceUseCase(adapter, templateAccess);
        const pdf = await PDFDocument.create();
        const page = pdf.addPage();
        page.drawText("Sample consulting agreement", { x: 52, y: 760, size: 18 });
        page.drawText("For this demonstration, review the agreement and sign below.", {
          x: 52,
          y: 730,
          size: 11,
        });
        const bytes = Buffer.from(await pdf.save());
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        const templateId = randomUUID();
        await saveSignTemplate.execute(f.ctx, templateId, randomUUID(), {
          ...body,
          layout: { ...body.layout, document: { ...body.layout.document, sha256 } },
        });
        expect((await readSignTemplateSource.execute(f.ctx, templateId)).base64).toBeNull();
        await expect(
          attachSignTemplateSource.execute(f.ctx, templateId, {
            base64: Buffer.from("%PDF-other").toString("base64"),
          })
        ).rejects.toThrow("differs");
        await attachSignTemplateSource.execute(f.ctx, templateId, {
          base64: bytes.toString("base64"),
        });
        await attachSignTemplateSource.execute(f.ctx, templateId, {
          base64: bytes.toString("base64"),
        });
        expect(objects.size).toBe(1);
        expect((await readSignTemplateSource.execute(f.ctx, templateId)).base64).toBe(
          bytes.toString("base64")
        );
        await expect(
          readSignTemplateSource.execute({ ...f.ctx, workspaceId: f.workspaceA2 }, templateId)
        ).rejects.toThrow("not found");
        const row = await db.file.findFirstOrThrow({ where: { sha256, tenantId: f.tenantA } });
        expect(
          await new PrismaDocumentRepoAdapter(db).findById(f.tenantA, row.documentId)
        ).toBeNull();
        expect(await new PrismaFileRepoAdapter(db).findByIdGlobal(row.id)).toBeNull();
        expect(await new BackgroundFiles(db).findByIdGlobal(row.id)).toBeNull();
        expect(await new BackgroundDocuments(db).findById(f.tenantA, row.documentId)).toBeNull();
        const publisher = new PublishSignTemplateUseCase(
          access,
          new PrismaSignDraftRepository(db),
          adapter,
          { pageCount: inspectTemplatePdf },
          new PrismaUnitOfWork(db),
          f.audit,
          f.outbox
        );
        await expect(publisher.execute(f.ctx, templateId, { revision: 1 })).rejects.toThrow(
          "required signature"
        );
        const saved = await getSignTemplate.execute(f.ctx, templateId);
        const signature = {
          id: "signature",
          type: "signature",
          roleId: "client",
          documentId: "original",
          pageIndex: 0,
          required: true,
          rect: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
        };
        await saveSignTemplate.execute(f.ctx, templateId, randomUUID(), {
          ...body,
          expectedRevision: 1,
          layout: { ...saved.layout, fields: [signature] },
        });
        const auth = f.auth;
        const harness = await Test.createTestingModule({
          controllers: [SignTemplatesController],
          providers: [
            { provide: ListSignTemplatesUseCase, useValue: listSignTemplates },
            { provide: GetSignTemplateUseCase, useValue: getSignTemplate },
            { provide: SaveSignTemplateUseCase, useValue: saveSignTemplate },
            { provide: ArchiveSignTemplateUseCase, useValue: archiveSignTemplate },
            { provide: AttachSignTemplateSourceUseCase, useValue: attachSignTemplateSource },
            { provide: ReadSignTemplateSourceUseCase, useValue: readSignTemplateSource },
            { provide: PublishSignTemplateUseCase, useValue: publisher },
            { provide: AuthGuard, useValue: auth },
          ],
        })
          .overrideGuard(AuthGuard)
          .useValue(auth)
          .compile();
        const app = harness.createNestApplication();
        app.useGlobalFilters(new ProblemDetailsExceptionFilter());
        await app.init();
        try {
          const endpoint = "/sign/templates/" + templateId;
          expect((await request(app.getHttpServer()).get(endpoint)).status).toBe(401);
          const res = await request(app.getHttpServer())
            .get(endpoint + "/source")
            .set("Authorization", "Bearer manager")
            .set("X-Workspace-Id", f.workspaceA);
          expect(res.status).toBe(200);
          expect(res.body.base64).toBe(bytes.toString("base64"));
          expect(res.headers["cache-control"]).toContain("no-store");
          const denied = await request(app.getHttpServer())
            .get(endpoint + "/source")
            .set("Authorization", "Bearer manager")
            .set("X-Workspace-Id", f.workspaceA2);
          expect(denied.status).toBe(404);
          const publication = await request(app.getHttpServer())
            .put(endpoint + "/versions/2")
            .set("Authorization", "Bearer manager")
            .set("X-Workspace-Id", f.workspaceA);
          expect(publication.status).toBe(200);
          expect(publication.body.canonicalSha256).toBe(sha256);
        } finally {
          await app.close();
        }
        const published = await publisher.execute(f.ctx, templateId, { revision: 2 });
        expect(published.canonicalSha256).toBe(sha256);
        await saveSignTemplate.execute(f.ctx, templateId, randomUUID(), {
          ...body,
          expectedRevision: 2,
          title: "Next draft",
        });
        expect(await publisher.execute(f.ctx, templateId, { revision: 2 })).toEqual(published);
        expect(await db.signTemplatePublication.count({ where: { templateId } })).toBe(1);
        await db.rolePermissionGrant.createMany({
          data: ["sign.requests.read", "sign.requests.create", "sign.requests.send"].map(
            (permissionKey) => ({
              tenantId: f.tenantA,
              roleId: f.managerRole,
              permissionKey,
              effect: "ALLOW" as const,
            })
          ),
        });
        const requests = new PrismaRequestDraftRepository(db);
        const templates = new PrismaSignDraftRepository(db);
        const uow = new PrismaUnitOfWork(db);
        const listSignRequests = new ListSignRequestsUseCase(access, requests);
        const getSignRequest = new GetSignRequestUseCase(access, requests);
        const createSignRequestDraft = new CreateSignRequestDraftUseCase(
          access,
          templates,
          requests,
          uow,
          f.audit,
          f.outbox
        );
        const recipients = [
          { roleId: "client", name: "Synthetic signer", email: "signer@example.invalid" },
        ];
        const input = { templateId, templateRevision: 2, routing: "sequential", recipients };
        await expect(
          createSignRequestDraft.execute(
            f.ctx,
            { ...input, recipients: [{ ...recipients[0], roleId: "other" }] },
            randomUUID()
          )
        ).rejects.toThrow("every published role");
        const requestKey = randomUUID();
        const offer = await db.coachingOffer.create({
          data: {
            tenantId: f.tenantA,
            workspaceId: f.workspaceA,
            titleJson: { en: "Fixture" },
            currency: "EUR",
            priceCents: 1000,
            sessionDurationMinutes: 20,
          },
        });
        const engagement = await db.coachingEngagement.create({
          data: {
            tenantId: f.tenantA,
            workspaceId: f.workspaceA,
            offerId: offer.id,
            clientPartyId: "fixture",
            coachUserId: f.ctx.userId,
          },
        });
        const coaching = new NativeCoachingAgreements(
          new PrismaCoachingEngagementRepositoryAdapter(db),
          createSignRequestDraft,
          {
            getCustomerBillingSnapshot: async () => ({
              partyId: "fixture",
              displayName: "Synthetic signer",
              email: recipients[0].email,
            }),
          },
          new PrismaUnitOfWork(db)
        );
        const req = await coaching.prepare(f.ctx, engagement.id, input, requestKey);
        expect((await coaching.prepare(f.ctx, engagement.id, input, requestKey)).requestId).toBe(
          req.requestId
        );
        expect(req).toMatchObject({
          canonicalSha256: sha256,
          status: "DRAFT",
          recipients,
          templateRevision: 2,
        });
        expect(await listSignRequests.execute(f.ctx)).toEqual({
          items: [
            { requestId: req.requestId, title: req.title, status: "DRAFT", templateRevision: 2 },
          ],
          nextCursor: null,
        });
        expect((await listSignRequests.execute(f.ctx, req.requestId)).items).toEqual([]);
        expect(
          (await listSignRequests.execute({ ...f.ctx, workspaceId: f.workspaceA2 })).items
        ).toEqual([]);
        expect(await createSignRequestDraft.execute(f.ctx, input, requestKey)).toEqual(req);
        const recipientPort = Number(process.env.SIGN_E2E_RECIPIENT_PORT ?? 48269);
        process.env.SIGN_PUBLIC_ORIGIN = `http://127.0.0.1:${recipientPort}`;
        process.env.SIGN_DELIVERY_KEY = createHash("sha256").update(randomUUID()).digest("hex");
        const ceremonies = new PrismaCeremonyRepository(db);
        const transitions = new CeremonyTransitionsService(
          ceremonies,
          invitationSecrets,
          f.audit,
          f.outbox
        );
        const requestAccess = new SignRequestAccessService(access, ceremonies);
        const sendSignRequest = new SendSignRequestUseCase(
          transitions,
          invitationSecrets,
          new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(db)),
          ceremonies,
          templates,
          uow,
          requestAccess
        );
        const getSignRequestProgress = new GetSignRequestProgressUseCase(
          ceremonies,
          uow,
          requestAccess
        );
        const voidSignRequest = new VoidSignRequestUseCase(
          transitions,
          ceremonies,
          uow,
          requestAccess
        );
        const expireSignRequests = new ExpireSignRequestsUseCase(transitions, ceremonies, uow);
        const remindSignRecipient = new RemindSignRecipientUseCase(
          transitions,
          ceremonies,
          uow,
          requestAccess
        );
        const deliverSignInvitation = new DeliverSignInvitationUseCase(
          invitationSecrets,
          ceremonies,
          entitlements,
          uow
        );
        const sessions = new RecipientSessionAccessService(ceremonies, entitlements);
        const exchangeSignInvitation = new ExchangeSignInvitationUseCase(
          invitationSecrets,
          ceremonies,
          uow,
          sessions
        );
        const reviewSignRequest = new ReviewSignRequestUseCase(templates, adapter, uow, sessions);
        const saveRecipientProgress = new SaveRecipientProgressUseCase(
          ceremonies,
          templates,
          uow,
          sessions
        );
        const previewSignAcceptance = new PreviewSignAcceptanceUseCase(
          new PdfArtifactEngine(),
          invitationSecrets,
          templates,
          adapter,
          uow,
          sessions
        );
        const acceptSignRequest = new AcceptSignRequestUseCase(
          transitions,
          invitationSecrets,
          ceremonies,
          templates,
          uow,
          sessions
        );
        const declineSignRequest = new DeclineSignRequestUseCase(transitions, uow, sessions);
        const send = {
          confirm: true,
          consent: "Synthetic test consent",
          invitation: "Test invitation",
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          canonicalSha256: sha256,
        };
        await sendSignRequest.execute(f.ctx, req.requestId, send);
        await sendSignRequest.execute(f.ctx, req.requestId, send);
        expect((await getSignRequestProgress.execute(f.ctx, req.requestId)).status).toBe("SENT");
        const reminderKey = randomUUID();
        await remindSignRecipient.execute(f.ctx, req.requestId, "client", reminderKey);
        await remindSignRecipient.execute(f.ctx, req.requestId, "client", reminderKey);
        await expect(
          remindSignRecipient.execute(f.ctx, req.requestId, "client", randomUUID())
        ).rejects.toThrow("15 minutes");
        expect(await db.signReminder.count({ where: { requestId: req.requestId } })).toBe(1);
        const invited = await db.signCeremonyRecipient.findFirstOrThrow({
          where: { requestId: req.requestId },
        });
        const event = {
          tenantId: f.tenantA,
          workspaceId: f.workspaceA,
          requestId: req.requestId,
          recipientId: invited.id,
          deliveryId: randomUUID(),
          digest: invited.tokenDigest!,
        };
        let token = "";
        await deliverSignInvitation.execute(event, {
          sendEmail: async (mail) => {
            token = mail.text!.split("#").pop()!;
            return { provider: "test", providerMessageId: "synthetic" };
          },
        });
        expect(token).toHaveLength(43);
        expect(
          (await db.signCeremonyRecipient.findUniqueOrThrow({ where: { id: invited.id } })).envelope
        ).toBeNull();
        const publicHarness = await Test.createTestingModule({
          controllers: [PublicCeremonyController],
          providers: [
            { provide: ExchangeSignInvitationUseCase, useValue: exchangeSignInvitation },
            { provide: ReviewSignRequestUseCase, useValue: reviewSignRequest },
            { provide: SaveRecipientProgressUseCase, useValue: saveRecipientProgress },
            { provide: PreviewSignAcceptanceUseCase, useValue: previewSignAcceptance },
            { provide: AcceptSignRequestUseCase, useValue: acceptSignRequest },
            { provide: DeclineSignRequestUseCase, useValue: declineSignRequest },
            { provide: InvitationSecrets, useValue: invitationSecrets },
          ],
        }).compile();
        const publicApp = publicHarness.createNestApplication();
        await publicApp.init();
        try {
          const http = request(publicApp.getHttpServer());
          expect((await http.get("/public/signing/exchange")).status).toBe(404);
          expect((await http.post("/public/signing/exchange").send({ token })).status).toBe(403);
          const exchange = await http
            .post("/public/signing/exchange")
            .set("Origin", process.env.SIGN_PUBLIC_ORIGIN)
            .set("X-Sign-Action", "1")
            .send({ token });
          expect(exchange.status).toBe(201);
          expect(exchange.headers["set-cookie"][0]).toContain("HttpOnly");
          const response = await http
            .post("/public/signing/review")
            .set("Cookie", exchange.headers["set-cookie"][0].split(";")[0])
            .set("Origin", process.env.SIGN_PUBLIC_ORIGIN)
            .set("X-Sign-Action", "1")
            .send({});
          expect(response.body.pdf).toBe(bytes.toString("base64"));
          if (process.env.SIGN_RUN_BROWSER === "1") {
            const liveDraft = await createSignRequestDraft.execute(f.ctx, input, randomUUID());
            await sendSignRequest.execute(f.ctx, liveDraft.requestId, send);
            const row = await db.signCeremonyRecipient.findFirstOrThrow({
              where: { requestId: liveDraft.requestId },
            });
            let invitation = "";
            await deliverSignInvitation.execute(
              {
                ...event,
                requestId: liveDraft.requestId,
                recipientId: row.id,
                digest: row.tokenDigest,
                deliveryId: randomUUID(),
              },
              {
                sendEmail: async (mail) => {
                  invitation = mail.text.split("#").pop();
                  return { provider: "test", providerMessageId: "fixture" };
                },
              }
            );
            await publicApp.listen(0, "127.0.0.1");
            const requireE2E = createRequire(
              new URL("../../../../../../apps/e2e/package.json", import.meta.url)
            );
            const cwd = requireE2E.resolve("./package.json").replace(/package\.json$/, "");
            try {
              await promisify(execFile)(
                process.execPath,
                [
                  requireE2E.resolve("@playwright/test/cli"),
                  "test",
                  "--config",
                  "playwright.sign-recipient.config.ts",
                ],
                {
                  cwd,
                  timeout: 160000,
                  env: {
                    ...process.env,
                    NODE_ENV: "development",
                    SIGN_FIXTURE_INVITATION: invitation,
                    PUBLIC_API_BASE_URL: await publicApp.getUrl(),
                  },
                }
              );
            } catch (error) {
              const reason = error as { stdout?: string; stderr?: string };
              throw Error(
                (reason.stdout ?? "").replaceAll(invitation, "[redacted]").slice(-2000) +
                  (reason.stderr ?? "").replaceAll(invitation, "[redacted]").slice(-800)
              );
            }
            expect((await getSignRequestProgress.execute(f.ctx, liveDraft.requestId)).status).toBe(
              "COLLECTED"
            );
          }
        } finally {
          await publicApp.close();
        }
        const { session } = await exchangeSignInvitation.execute(token);
        const reviewed = await reviewSignRequest.execute(session);
        expect(reviewed.pdf).toBe(bytes.toString("base64"));
        await expect(
          previewSignAcceptance.execute(session, {
            consent: true,
            review: reviewed.review,
            values: [],
          })
        ).rejects.toThrow("assigned fields");
        const answers = {
          consent: true,
          review: reviewed.review,
          values: [{ fieldId: "signature", value: "Test signer" }],
        };
        const approval = await previewSignAcceptance.execute(session, answers);
        const acceptance = { ...answers, confirmation: approval.confirmation };
        await expect(
          acceptSignRequest.execute(session, {
            ...acceptance,
            values: [{ fieldId: "signature", value: "Changed" }],
          })
        ).rejects.toThrow("Review");
        await saveRecipientProgress.execute(session, acceptance.values);
        expect((await reviewSignRequest.execute(session)).saved).toEqual(acceptance.values);
        await Promise.all([
          acceptSignRequest.execute(session, acceptance),
          acceptSignRequest.execute(session, acceptance),
        ]);
        expect((await getSignRequestProgress.execute(f.ctx, req.requestId)).status).toBe(
          "COLLECTED"
        );
        await expect(exchangeSignInvitation.execute(token)).rejects.toThrow("unavailable");
        // Exercise ordered and parallel authority with distinct recipient sessions.
        const pairId = randomUUID();
        await saveSignTemplate.execute(f.ctx, pairId, randomUUID(), {
          ...body,
          layout: {
            ...saved.layout,
            roles: [...saved.layout.roles, { id: "reviewer", name: "Reviewer" }],
            fields: [signature, { ...signature, id: "reviewer-signature", roleId: "reviewer" }],
          },
        });
        await attachSignTemplateSource.execute(f.ctx, pairId, { base64: bytes.toString("base64") });
        await publisher.execute(f.ctx, pairId, { revision: 1 });
        const pairInput = {
          ...input,
          templateId: pairId,
          templateRevision: 1,
          recipients: [
            ...recipients,
            { roleId: "reviewer", name: "Other reviewer", email: "reviewer@example.invalid" },
          ],
        };
        async function fakeInbox(id: string, roleId: string) {
          const row = await db.signCeremonyRecipient.findFirstOrThrow({
            where: { requestId: id, roleId },
          });
          let link = "";
          await deliverSignInvitation.execute(
            {
              ...event,
              requestId: id,
              recipientId: row.id,
              digest: row.tokenDigest!,
              deliveryId: randomUUID(),
            },
            {
              sendEmail: async (mail) => {
                link = mail.text!.split("#").pop()!;
                return { provider: "test", providerMessageId: "fixture" };
              },
            }
          );
          return link;
        }
        const pair = await createSignRequestDraft.execute(f.ctx, pairInput, randomUUID());
        await sendSignRequest.execute(f.ctx, pair.requestId, send);
        expect(
          (await getSignRequestProgress.execute(f.ctx, pair.requestId)).recipients.map(
            (s) => s.status
          )
        ).toEqual(["INVITED", "WAITING"]);
        const firstSession = (
          await exchangeSignInvitation.execute(await fakeInbox(pair.requestId, "client"))
        ).session;
        const firstReview = await reviewSignRequest.execute(firstSession);
        await expect(
          acceptSignRequest.execute(firstSession, {
            ...acceptance,
            review: firstReview.review,
            values: [{ fieldId: "reviewer-signature", value: "Other role" }],
          })
        ).rejects.toThrow();
        const nextAnswers = { ...answers, review: firstReview.review };
        const choice = await previewSignAcceptance.execute(firstSession, nextAnswers);
        await acceptSignRequest.execute(firstSession, {
          ...nextAnswers,
          confirmation: choice.confirmation,
        });
        const lastSession = (
          await exchangeSignInvitation.execute(await fakeInbox(pair.requestId, "reviewer"))
        ).session;
        await declineSignRequest.execute(lastSession);
        expect((await getSignRequestProgress.execute(f.ctx, pair.requestId)).status).toBe(
          "DECLINED"
        );
        const parallel = await createSignRequestDraft.execute(
          f.ctx,
          { ...pairInput, routing: "parallel" },
          randomUUID()
        );
        await sendSignRequest.execute(f.ctx, parallel.requestId, send);
        expect(
          (await getSignRequestProgress.execute(f.ctx, parallel.requestId)).recipients.map(
            (s) => s.status
          )
        ).toEqual(["INVITED", "INVITED"]);
        const revoked = await fakeInbox(parallel.requestId, "client");
        await voidSignRequest.execute(f.ctx, parallel.requestId);
        await expect(exchangeSignInvitation.execute(revoked)).rejects.toThrow();
        const expiring = await createSignRequestDraft.execute(f.ctx, pairInput, randomUUID());
        await sendSignRequest.execute(f.ctx, expiring.requestId, send);
        await db.signCeremony.updateMany({
          where: { requestId: expiring.requestId },
          data: { expiresAt: new Date(Date.now() - 1) },
        });
        await expireSignRequests.execute();
        expect((await getSignRequestProgress.execute(f.ctx, expiring.requestId)).status).toBe(
          "EXPIRED"
        );
        expect(
          await db.signCeremonyRecipient.count({
            where: { requestId: expiring.requestId, envelope: { not: null } },
          })
        ).toBe(0);
        const certDir = await mkdtemp(join(tmpdir(), "sign-test-certificate-"));
        try {
          const engine = new PdfArtifactEngine();
          const artifactRepo = new PrismaCeremonyRepository(db);
          const finalizeSignRequest = new FinalizeSignRequestUseCase(
            artifactRepo,
            templates,
            adapter,
            engine,
            uow,
            f.audit,
            f.outbox
          );
          const downloadSignArtifact = new DownloadSignArtifactUseCase(
            access,
            artifactRepo,
            adapter,
            engine,
            uow,
            f.audit
          );
          const ref = { tenantId: f.tenantA, workspaceId: f.workspaceA, requestId: req.requestId };
          process.env.SIGN_CERT_FILE = join(certDir, "test.crt");
          process.env.SIGN_KEY_FILE = join(certDir, "test.key");
          process.env.SIGN_TRUST_FILE = process.env.SIGN_CERT_FILE;
          await expect(finalizeSignRequest.execute(ref)).rejects.toThrow();
          expect((await getSignRequestProgress.execute(f.ctx, req.requestId)).status).toBe(
            "COLLECTED"
          );
          execFileSync(
            process.env.SIGN_OPENSSL_BIN ?? "openssl",
            [
              "req",
              "-x509",
              "-newkey",
              "rsa:2048",
              "-nodes",
              "-days",
              "1",
              "-subj",
              "/CN=Untrusted Corely Test Fixture",
              "-keyout",
              process.env.SIGN_KEY_FILE,
              "-out",
              process.env.SIGN_CERT_FILE,
            ],
            { stdio: "ignore" }
          );
          process.env.SIGN_TRUSTED_FINGERPRINTS = new X509Certificate(
            await readFile(process.env.SIGN_CERT_FILE)
          ).fingerprint256;
          const change = artifactRepo.change.bind(artifactRepo);
          const fault = vi.spyOn(artifactRepo, "change").mockImplementation((ref, patch, tx) => {
            if (patch.status === "COMPLETED") throw Error("Simulated failure after storage");
            return change(ref, patch, tx);
          });
          const render = vi.spyOn(engine, "generate");
          await expect(finalizeSignRequest.execute(ref)).rejects.toThrow(
            "Simulated failure after storage"
          );
          fault.mockRestore();
          await finalizeSignRequest.execute(ref);
          await finalizeSignRequest.execute(ref);
          expect(render).toHaveBeenCalledTimes(1);
          expect((await getSignRequestProgress.execute(f.ctx, req.requestId)).status).toBe(
            "COMPLETED"
          );
          const archived = await downloadSignArtifact.execute(f.ctx, req.requestId);
          await expect(
            downloadSignArtifact.execute(f.ctx, req.requestId, "evidence")
          ).rejects.toThrow("denied");
          await db.rolePermissionGrant.create({
            data: {
              tenantId: f.tenantA,
              roleId: f.managerRole,
              permissionKey: "sign.requests.export",
              effect: "ALLOW",
            },
          });
          const bundle = await downloadSignArtifact.execute(f.ctx, req.requestId, "evidence");
          if (process.env.SIGN_FIXTURE_EXPORT_DIR) {
            const dir = process.env.SIGN_FIXTURE_EXPORT_DIR;
            await writeFile(
              join(dir, "sample-signed.pdf"),
              Buffer.from(archived.base64, "base64"),
              { flag: "wx" }
            );
            await writeFile(join(dir, "sample-bundle.zip"), Buffer.from(bundle.base64, "base64"), {
              flag: "wx",
            });
            await copyFile(process.env.SIGN_CERT_FILE, join(dir, "sample-public.crt"));
          }
          await expect(
            engine.verify(
              Buffer.from(archived.base64, "base64"),
              new Date(Date.now() + 3 * 86400000)
            )
          ).rejects.toThrow();
          const parts = unzipSync(Buffer.from(bundle.base64, "base64"));
          expect(Buffer.from(parts["original.pdf"])).toEqual(bytes);
          expect(
            JSON.parse(Buffer.from(parts["evidence.json"]).toString()).acceptances[0].values
          ).toEqual(acceptance.values);
          expect(
            JSON.parse(Buffer.from(parts["verification.json"]).toString()).artifactSha256
          ).toBe(archived.sha256);

          await Promise.all(
            [1, 2].map(() =>
              coaching.verified(f.tenantA, f.workspaceA, req.requestId, archived.sha256)
            )
          );
          expect(
            await db.coachingEngagementEvent.count({
              where: { engagementId: engagement.id, eventType: "coaching.agreement.verified" },
            })
          ).toBe(1);
          await restoreFixture(ref, archived.sha256, objects);
          const altered = Buffer.from(archived.base64, "base64");
          altered[7] ^= 1;
          await expect(engine.verify(altered)).rejects.toThrow();
          process.env.SIGN_TRUSTED_FINGERPRINTS = "untrusted";
          await expect(engine.verify(Buffer.from(archived.base64, "base64"))).rejects.toThrow(
            "certificate"
          );
          await expect(
            downloadSignArtifact.execute({ ...f.ctx, workspaceId: f.workspaceA2 }, req.requestId)
          ).rejects.toThrow();
        } finally {
          await rm(certDir, { recursive: true, force: true });
          for (const name of [
            "SIGN_CERT_FILE",
            "SIGN_KEY_FILE",
            "SIGN_TRUST_FILE",
            "SIGN_TRUSTED_FINGERPRINTS",
            "SIGN_PUBLIC_ORIGIN",
            "SIGN_DELIVERY_KEY",
          ])
            delete process.env[name];
        }

        await expect(
          createSignRequestDraft.execute(f.ctx, { ...input, routing: "parallel" }, requestKey)
        ).rejects.toThrow("different");
        await expect(
          getSignRequest.execute({ ...f.ctx, workspaceId: f.workspaceA2 }, req.requestId)
        ).rejects.toThrow("not found");
        expect(
          (
            await db.outboxEvent.findMany({
              where: { tenantId: f.tenantA, eventType: "sign.request.draft_created.v1" },
            })
          )
            .map((row) => row.payloadJson)
            .join("")
        ).not.toContain("example.invalid");
        const key = randomUUID();
        expect(
          (await archiveSignTemplate.execute(f.ctx, templateId, key, { revision: 3 })).archived
        ).toBe(true);
        expect(
          (await archiveSignTemplate.execute(f.ctx, templateId, key, { revision: 3 })).revision
        ).toBe(4);
        await expect(
          saveSignTemplate.execute(f.ctx, templateId, randomUUID(), {
            ...body,
            expectedRevision: 4,
          })
        ).rejects.toThrow("archived");
        expect((await publisher.execute(f.ctx, templateId, { revision: 2 })).canonicalSha256).toBe(
          sha256
        );
        await expect(createSignRequestDraft.execute(f.ctx, input, randomUUID())).rejects.toThrow(
          "active template"
        );
        expect((await getSignRequest.execute(f.ctx, req.requestId)).canonicalSha256).toBe(sha256);
        await storage.putObject({
          tenantId: f.tenantA,
          objectKey: row.objectKey,
          contentType: "application/pdf",
          bytes: Buffer.from("%PDF-altered"),
        });
        await expect(
          adapter.read({ tenantId: f.tenantA, workspaceId: f.workspaceA, templateId, sha256 })
        ).rejects.toThrow("integrity");
      },
      process.env.SIGN_RUN_BROWSER === "1" ? 200000 : 30000
    );
    it("isolates workspaces, rechecks membership, permissions and app enablement", async () => {
      const other = { ...f.ctx, workspaceId: f.workspaceA2 };
      expect((await listSignTemplates.execute(other)).items).toEqual([]);
      await expect(getSignTemplate.execute(other, id)).rejects.toThrow(/not found/);
      await expect(
        getSignTemplate.execute({ ...f.ctx, workspaceId: f.workspaceB }, id)
      ).rejects.toThrow();
      await expect(
        saveSignTemplate.execute({ ...f.ctx, userId: f.staff }, id, randomUUID(), body)
      ).rejects.toThrow(/denied/);
      await expect(
        getSignTemplate.execute(
          { ...f.ctx, userId: f.outsider, tenantId: f.tenantB, workspaceId: f.workspaceB },
          id
        )
      ).rejects.toThrow();
      await settings.updateAppEnablement(f.tenantA, "sign", false, f.manager);
      await expect(getSignTemplate.execute(f.ctx, id)).rejects.toThrow(/denied/);
    });
  }
);
