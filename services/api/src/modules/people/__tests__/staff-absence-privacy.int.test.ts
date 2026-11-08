import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { StaffAbsenceUseCase } from "../application/staff-absence.usecase";
import { absenceTestFixture, absenceTestsEnabled } from "./staff-absence-fixture";
import { DocumentsPortAdapter } from "../../background/runtime/modules/issues/infrastructure/documents/documents-port.adapter";
import { PrismaIssueAttachmentRepositoryAdapter } from "../../issues/infrastructure/prisma/prisma-issue-attachment-repository.adapter";
import type { IssueAttachment } from "../../issues/domain/issue.types";
describe.skipIf(!absenceTestsEnabled)(
  "Persisted personnel attachments and access revocation",
  () => {
    const fixture = absenceTestFixture();
    let { prisma, f, now, staffId, storage, base, get, post, fields, create, grant, upload } =
      fixture.current;
    beforeEach(() => {
      ({ prisma, f, now, staffId, storage, base, get, post, fields, create, grant, upload } =
        fixture.current);
    });
    it("authorizes attachment record, relation, permission, workspace and file bytes with no signed URL", async () => {
      const absence = await create(),
        key = randomUUID();
      const uploaded = await upload(absence.id, key);
      expect(uploaded.status).toBe(201);
      const docId = uploaded.body.documentId;
      expect((await upload(absence.id, key)).body).toEqual(uploaded.body);
      expect(await prisma.file.count({ where: { tenantId: f.tenantA, documentId: docId } })).toBe(
        1
      );
      const path = `${base()}/${absence.id}/attachments`;
      expect((await get(path)).body.items).toEqual([uploaded.body]);
      const downloaded = await get(`${path}/${docId}/download`);
      expect(downloaded.status).toBe(200);
      expect(downloaded.body.toString()).toBe("synthetic private file bytes");
      expect(downloaded.headers["cache-control"]).toBe("private, no-store");
      expect(downloaded.headers["x-content-type-options"]).toBe("nosniff");
      expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
      expect(storage.createSignedUploadUrl).not.toHaveBeenCalled();
      for (const permission of [
        "documents.read",
        "documents.manage",
        "people.export",
        "people.audit.read",
      ])
        await grant(f.staffRole, permission);
      expect((await get(path, "staff")).status).toBe(403);
      expect((await get(`${path}/${docId}/download`, "staff")).status).toBe(403);
      expect((await upload(absence.id, randomUUID(), "staff")).status).toBe(403);
      expect((await get(`${path}/${docId}/download`, "manager", f.workspaceA2)).status).toBe(404);
      expect((await get(`${path}/${docId}/download`, "outsider", f.workspaceB)).status).toBe(404);
      const other = await create(fields("2026-11-16T09:00:00Z", "2026-11-16T10:00:00Z"));
      expect((await get(`${base()}/${other.id}/attachments/${docId}/download`)).status).toBe(404);
      await grant(f.managerRole, "people.documents.read", "DENY");
      const reads = storage.getObject.mock.calls.length;
      expect((await get(path)).status).toBe(403);
      expect((await get(`${path}/${docId}/download`)).status).toBe(403);
      expect(storage.getObject.mock.calls.length).toBe(reads);
      expect((await upload(absence.id, key)).status).toBe(403);
    });
    it("keeps private attachments invisible through generic document/link/sign/proxy/public and background paths", async () => {
      const absence = await create(),
        uploaded = await upload(absence.id);
      const docId = uploaded.body.documentId;
      const file = await prisma.file.findFirstOrThrow({
        where: { documentId: docId, tenantId: f.tenantA },
      });
      for (const permission of ["documents.read", "documents.manage"]) {
        await grant(f.managerRole, permission);
        await grant(f.staffRole, permission);
      }
      for (const token of ["manager", "staff"])
        for (const suffix of [
          "download-url",
          `files/${file.id}/download-url`,
          "download",
          `files/${file.id}/download`,
        ])
          expect((await get(`/documents/${docId}/${suffix}`, token)).status).toBe(404);
      expect(
        (await post(`/documents/${docId}/link`, { entityType: "OTHER", entityId: "guessed" }))
          .status
      ).toBe(404);
      expect(
        (await post(`/documents/${docId}/unlink`, { entityType: "OTHER", entityId: "guessed" }))
          .status
      ).toBe(404);
      expect((await post(`/documents/${docId}/files/${file.id}/complete`, {})).status).toBe(404);
      // Even a legacy bad relation or accidental public bit cannot declassify a personnel file.
      await prisma.documentLink.create({
        data: {
          tenantId: f.tenantA,
          documentId: docId,
          entityType: "OTHER",
          entityId: "legacy-link",
        },
      });
      expect(
        (await get("/documents/by-entity?entityType=OTHER&entityId=legacy-link")).body.items
      ).toEqual([]);
      await prisma.file.update({ where: { id: file.id }, data: { isPublic: true } });
      expect(
        (await request(f.app.getHttpServer()).get(`/public/documents/files/${file.id}`)).status
      ).toBe(404);
      expect(await f.docRepo.findById(f.tenantA, docId)).toBeNull();
      expect(
        await f.docRepo.findByTypeAndEntityLink(f.tenantA, "UPLOAD", "OTHER", "legacy-link")
      ).toBeNull();
      expect(await f.fileRepo.findByIdGlobal(file.id)).toBeNull();
      await expect(
        new DocumentsPortAdapter(prisma, storage).getAudioBuffer({
          tenantId: f.tenantA,
          documentId: docId,
        })
      ).rejects.toThrow("Document not found");
      const bridge = new PrismaIssueAttachmentRepositoryAdapter(prisma);
      await expect(bridge.createMany([{ documentId: docId } as IssueAttachment])).rejects.toThrow(
        "Document not found"
      );
      expect(storage.getObject).not.toHaveBeenCalled();
      expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
    });
    it("rechecks permission and membership after storage I/O, and never replays stale private authority", async () => {
      const absence = await create(),
        uploaded = await upload(absence.id);
      storage.getObject.mockImplementationOnce(async () => {
        await grant(f.managerRole, "people.private.read", "DENY");
        return Buffer.from("must not escape");
      });
      expect(
        (await get(`${base()}/${absence.id}/attachments/${uploaded.body.documentId}/download`))
          .status
      ).toBe(403);
      expect((await get()).status).toBe(403);
      await grant(f.managerRole, "people.private.read", "ALLOW");
      await prisma.workspaceMembership.updateMany({
        where: { workspaceId: f.workspaceA, userId: f.manager },
        data: { status: "DISABLED" },
      });
      expect((await get()).status).toBe(403);
      await expect(f.absenceUseCase.list(staffId, f.ctx)).rejects.toThrow();
    });
    it("rejects attachment forgery, oversized content, storage failure and rolls back relational metadata on audit failure", async () => {
      const absence = await create();
      expect(
        (
          await post(`${base()}/${absence.id}/attachments`, {
            version: 1,
            filename: "x",
            contentType: "text/html",
            base64: "dGVzdA==",
            isPublic: true,
          })
        ).status
      ).toBe(400);
      expect(
        (
          await post(`${base()}/${absence.id}/attachments`, {
            version: 1,
            filename: "x",
            contentType: "text/plain",
            base64: "invalid!",
          })
        ).status
      ).toBe(400);
      await expect(
        f.absenceUseCase.upload(
          staffId,
          absence.id,
          {
            version: 1,
            filename: "oversized.txt",
            contentType: "text/plain",
            base64: Buffer.alloc(1024 * 1024 + 1).toString("base64"),
          },
          randomUUID(),
          f.ctx
        )
      ).rejects.toThrow("1 MiB");
      storage.putObject.mockRejectedValueOnce(new Error("synthetic storage failure"));
      expect((await upload(absence.id)).status).toBe(500);
      expect(await prisma.document.count({ where: { tenantId: f.tenantA } })).toBe(0);
      const failing = new StaffAbsenceUseCase(
        f.repo,
        f.absences,
        f.permissions,
        f.platformEntitlements,
        f.booking,
        f.documents,
        {
          log: async () => {
            throw new Error("synthetic audit failure");
          },
        },
        f.outbox,
        { now: () => now }
      );
      const key = randomUUID(),
        body = {
          version: 1,
          filename: "example.txt",
          contentType: "text/plain",
          base64: Buffer.from("bytes").toString("base64"),
        };
      await expect(failing.upload(staffId, absence.id, body, key, f.ctx)).rejects.toThrow(
        "synthetic audit"
      );
      expect(await prisma.document.count({ where: { tenantId: f.tenantA } })).toBe(0);
      expect(await prisma.file.count({ where: { tenantId: f.tenantA } })).toBe(0);
      expect((await f.absenceUseCase.attachments(staffId, absence.id, f.ctx)).items).toEqual([]);
      expect(await f.absenceUseCase.upload(staffId, absence.id, body, key, f.ctx)).toMatchObject({
        filename: "example.txt",
      });
    });
  }
);
