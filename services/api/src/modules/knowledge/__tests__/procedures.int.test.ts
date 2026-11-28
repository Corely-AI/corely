import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
} from "@corely/data";
import { ProcedureDetailSchema } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import type { EnvService } from "@corely/config";
import { PrivateEmailOriginalsAdapter } from "../../documents/infrastructure/prisma/private-email-originals.adapter";
import { ProcedureDocumentsAdapter } from "../../documents/infrastructure/prisma/procedure-documents.adapter";
import { PrismaFileRepoAdapter } from "../../documents/infrastructure/prisma/prisma-file-repo.adapter";
import { FakeObjectStoragePort } from "../../documents/testkit/fakes/fake-object-storage";
import { ExtProcedureRepository } from "../infrastructure/ext-procedure-repository.adapter";
import { ProceduresUseCase } from "../application/procedures.usecase";

const url = process.env.KNOWLEDGE_TEST_DATABASE_URL;
const target = url ? new URL(url) : null;
const enabled =
  target &&
  ["localhost", "127.0.0.1"].includes(target.hostname) &&
  /^\/knowledge_test_[a-z0-9_]+$/.test(target.pathname);

describe.skipIf(!enabled)("private procedure publication with PostgreSQL", () => {
  const tenantId = randomUUID();
  const workspaceId = randomUUID();
  const author = { tenantId, workspaceId, userId: randomUUID() };
  const reader = { tenantId, workspaceId, userId: randomUUID() };
  const outsider = { tenantId, workspaceId: randomUUID(), userId: author.userId };
  const otherTenant = { ...author, tenantId: randomUUID() };
  const noAccess = { tenantId, workspaceId, userId: randomUUID() };
  const revoked = new Set<string>();
  let prisma: PrismaService;
  let app: ProceduresUseCase;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    prisma = new PrismaService();
    await prisma.$connect();
    const storage = new FakeObjectStoragePort();
    storage.getObject = async ({ objectKey }) => {
      const object = storage.objects.get(objectKey);
      if (!object) throw new Error("Test fixture object missing");
      return object.bytes;
    };
    const documents = new ProcedureDocumentsAdapter(
      new PrivateEmailOriginalsAdapter(prisma, storage, { STORAGE_KEY_PREFIX: "" } as EnvService)
    );
    const permissions = {
      execute: async (ctx: UseCaseContext) => ({
        permissions: {
          allowed:
            ctx.userId === author.userId
              ? ["knowledge.read", "knowledge.manage"]
              : ["knowledge.read"],
          denied:
            ctx.userId === noAccess.userId || (ctx.userId && revoked.has(ctx.userId))
              ? ["knowledge.read"]
              : [],
          allowAll: false,
        },
      }),
    };
    app = new ProceduresUseCase(
      new ExtProcedureRepository(prisma, new PrismaExtKvAdapter(prisma)),
      documents,
      permissions,
      { isAppEnabled: async () => true },
      { findById: async () => null },
      new PrismaAuditAdapter(prisma),
      new PrismaOutboxAdapter(prisma)
    );
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.extKv.deleteMany({ where: { tenantId, moduleId: "knowledge" } });
      await prisma.auditLog.deleteMany({ where: { tenantId } });
      await prisma.outboxEvent.deleteMany({ where: { tenantId } });
      await prisma.file.deleteMany({ where: { tenantId } });
      await prisma.document.deleteMany({ where: { tenantId } });
      await prisma.$disconnect();
    }
  });

  it("keeps the current published snapshot available until a revision is published or archived", async () => {
    const fields = {
      title: "Opening checklist",
      reviewDate: "2027-01-31",
      content: { kind: "page", text: "Check the supply cart." },
    };
    const createKey = randomUUID();
    for (const url of [
      "invalid",
      "javascript:alert(1)",
      "https://user:secret@example.invalid/procedure",
    ]) {
      await expect(
        app.command(
          "create",
          undefined,
          { ...fields, content: { kind: "link", url } },
          randomUUID(),
          author
        )
      ).rejects.toMatchObject({ name: "ZodError" });
    }
    const sent = await app.command("create", undefined, fields, createKey, author);
    const draft = ProcedureDetailSchema.parse(sent);
    expect(draft.ownerUserId).toBe(author.userId);
    expect(draft.draft?.title).toBe(fields.title);
    expect(await app.command("create", undefined, fields, createKey, author)).toEqual(draft);
    await expect(
      app.command("create", undefined, { ...fields, title: "Different" }, createKey, author)
    ).rejects.toMatchObject({ status: 409 });
    expect(await app.list(reader)).toEqual({ items: [], canManage: false });
    await expect(app.detail(draft.id, reader)).rejects.toMatchObject({ status: 404 });
    await expect(app.detail(draft.id, outsider)).rejects.toMatchObject({ status: 404 });
    await expect(app.detail(draft.id, otherTenant)).rejects.toMatchObject({ status: 404 });
    await expect(app.list(noAccess)).rejects.toMatchObject({ status: 403 });
    await expect(
      app.command("publish", draft.id, { revision: 1 }, randomUUID(), reader)
    ).rejects.toMatchObject({ status: 403 });

    const pubKey = randomUUID();
    const [published, replay] = await Promise.all([
      app.command("publish", draft.id, { revision: 1 }, pubKey, author),
      app.command("publish", draft.id, { revision: 1 }, pubKey, author),
    ]);
    expect(replay).toEqual(published);
    expect(published.published).toMatchObject({ ...fields, version: 1 });
    expect(
      await prisma.outboxEvent.count({
        where: { tenantId, eventType: "knowledge.procedure.publish" },
      })
    ).toBe(1);

    const changed = await app.command(
      "edit",
      draft.id,
      {
        title: "Updated opening checklist",
        reviewDate: "2027-04-30",
        content: { kind: "link", url: "https://example.invalid/procedure" },
        revision: published.revision,
      },
      randomUUID(),
      author
    );
    expect((await app.detail(draft.id, reader)).published).toEqual(published.published);
    expect((await app.detail(draft.id, reader)).draft).toBeNull();
    await expect(
      app.command("publish", draft.id, { revision: published.revision }, randomUUID(), author)
    ).rejects.toMatchObject({ status: 409 });
    const next = await app.command(
      "publish",
      draft.id,
      { revision: changed.revision },
      randomUUID(),
      author
    );
    expect((await app.detail(draft.id, reader)).published).toMatchObject({
      title: "Updated opening checklist",
      version: 2,
      reviewDate: "2027-04-30",
    });
    const versionRows = await prisma.extKv.findMany({
      where: {
        tenantId,
        moduleId: "knowledge",
        scope: `workspace:${workspaceId}:versions:${draft.id}`,
      },
      orderBy: { key: "asc" },
    });
    expect(versionRows.map((row) => row.value)).toEqual([published.published, next.published]);
    await app.command("archive", draft.id, { revision: next.revision }, randomUUID(), author);
    await expect(app.detail(draft.id, reader)).rejects.toMatchObject({ status: 404 });
    expect(await app.list(reader)).toEqual({ items: [], canManage: false });
    expect((await app.list(author)).items[0]?.status).toBe("archived");
  });

  it("never serves procedure bytes through public or ordinary document lookup", async () => {
    const bytes = Buffer.from("Private checklist fixture");
    const created = await app.command(
      "create",
      undefined,
      {
        title: "Checklist PDF",
        reviewDate: "2027-03-01",
        content: {
          kind: "file",
          upload: { filename: "checklist.txt", base64: bytes.toString("base64") },
        },
      },
      randomUUID(),
      author
    );
    if (created.draft?.content.kind !== "file") throw new Error("Expected a file draft");
    const { fileId } = created.draft.content;
    const stored = await prisma.file.findFirstOrThrow({
      where: { tenantId, documentId: { startsWith: "knowledge-private-" } },
    });
    const genericFiles = new PrismaFileRepoAdapter(prisma);
    expect(stored.isPublic).toBe(false);
    expect(await genericFiles.findById(tenantId, stored.id)).toBeNull();
    expect(await genericFiles.findByIdGlobal(stored.id)).toBeNull();
    await expect(app.download(created.id, fileId, reader)).rejects.toMatchObject({ status: 404 });
    const published = await app.command(
      "publish",
      created.id,
      { revision: created.revision },
      randomUUID(),
      author
    );
    expect(await app.download(created.id, fileId, reader)).toEqual({
      bytes,
      filename: "checklist.txt",
    });
    expect(await app.download(created.id, fileId, author, true)).toEqual({
      bytes,
      filename: "checklist.txt",
    });
    await expect(app.download(created.id, fileId, outsider)).rejects.toMatchObject({ status: 404 });
    await app.command(
      "archive",
      created.id,
      { revision: published.revision },
      randomUUID(),
      author
    );
    await expect(app.download(created.id, fileId, reader)).rejects.toMatchObject({ status: 404 });
    await expect(app.download(created.id, fileId, author, true)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("searches only the current publication and rechecks current access for every reference", async () => {
    const fields = {
      title: "Werkstattübergabe",
      reviewDate: "2000-01-01",
      content: { kind: "page", text: "Check the blue equipment cart." },
    };
    const created = await app.command("create", undefined, fields, randomUUID(), author);
    expect(await app.canRead(created.id, author)).toBe(false);
    expect((await app.searchPublished({ query: "Werkstatt" }, author)).items).toEqual([]);
    const first = await app.command(
      "publish",
      created.id,
      { revision: created.revision },
      randomUUID(),
      author
    );
    const current = await app.command(
      "edit",
      created.id,
      {
        ...fields,
        title: "Private future process",
        reviewDate: "2100-01-01",
        content: { kind: "page", text: "Red equipment cart" },
        revision: first.revision,
      },
      randomUUID(),
      author
    );
    const summary = {
      id: created.id,
      title: fields.title,
      reviewDate: fields.reviewDate,
      version: 1,
      reviewOverdue: true,
      ownerName: null,
    };
    for (const actor of [author, reader]) {
      expect((await app.searchPublished({ query: "  BLUE equipment  " }, actor)).items).toEqual([
        summary,
      ]);
      expect(
        (await app.searchPublished({ query: "WERKSTATTU\u0308BERGABE" }, actor)).items
      ).toEqual([summary]);
      expect((await app.searchPublished({ query: "Private future" }, actor)).items).toEqual([]);
      expect(await app.previewPublished(created.id, actor)).toEqual(summary);
      expect(await app.detailPublished(created.id, actor)).toEqual({
        id: created.id,
        ownerName: null,
        published: first.published,
        reviewOverdue: true,
      });
    }
    expect(await app.canRead(created.id, outsider)).toBe(false);
    expect(await app.canRead(created.id, otherTenant)).toBe(false);
    expect((await app.searchPublished({}, outsider)).items).toEqual([]);
    if (!reader.userId) throw new Error("Missing reader fixture");
    revoked.add(reader.userId);
    try {
      expect(await app.canRead(created.id, reader)).toBe(false);
      await expect(app.previewPublished(created.id, reader)).rejects.toMatchObject({ status: 403 });
      await expect(app.detailPublished(created.id, reader)).rejects.toMatchObject({ status: 403 });
      await expect(app.searchPublished({}, reader)).rejects.toMatchObject({ status: 403 });
    } finally {
      revoked.delete(reader.userId);
    }
    const next = await app.command(
      "publish",
      created.id,
      { revision: current.revision },
      randomUUID(),
      author
    );
    expect((await app.searchPublished({ query: "blue equipment" }, reader)).items).toEqual([]);
    expect(await app.previewPublished(created.id, reader)).toMatchObject({
      id: created.id,
      title: "Private future process",
      version: 2,
      reviewOverdue: false,
    });
    await app.command("archive", created.id, { revision: next.revision }, randomUUID(), author);
    expect(await app.canRead(created.id, author)).toBe(false);
    await expect(app.previewPublished(created.id, author)).rejects.toMatchObject({ status: 404 });
    expect((await app.searchPublished({}, author)).items).toEqual([]);
  });
});
