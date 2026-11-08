import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { randomUUID } from "node:crypto";
import { PrismaService, PrismaExtKvAdapter, getPrismaClient } from "@corely/data";
import { GcsObjectStorageAdapter } from "@corely/storage";
import { PersonnelAttachmentSchema, type PersonnelAttachmentOwner } from "@corely/contracts";
import type { ObjectStoragePort, TransactionContext } from "@corely/kernel";
import type { PersonnelDocumentsPort } from "../../application/ports/personnel-documents.port";
import { PERSONNEL_DOCUMENT_PREFIX, isPersonnelDocumentId } from "../../domain/personnel-document";
const keyFor = (owner: PersonnelAttachmentOwner, key: string) => ({
  tenantId: owner.tenantId,
  moduleId: "documents",
  scope: `personnel:${owner.workspaceId}:${owner.absenceId}`,
  key,
});
@Injectable()
export class PersonnelDocumentsAdapter implements PersonnelDocumentsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter,
    @Inject(GcsObjectStorageAdapter) private readonly storage: ObjectStoragePort,
    @Inject(EnvService) private readonly env: Pick<EnvService, "STORAGE_KEY_PREFIX">
  ) {}
  async list(owner: PersonnelAttachmentOwner, tx: TransactionContext) {
    const key = keyFor(owner, "");
    const rows = await getPrismaClient(this.prisma, tx).extKv.findMany({
      where: { tenantId: key.tenantId, moduleId: key.moduleId, scope: key.scope },
      select: { value: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => PersonnelAttachmentSchema.parse(row.value));
  }
  async upload(
    owner: PersonnelAttachmentOwner,
    input: { filename: string; contentType: string; bytes: Buffer },
    tx: TransactionContext
  ) {
    const db = getPrismaClient(this.prisma, tx);
    const documentId = `${PERSONNEL_DOCUMENT_PREFIX}${randomUUID()}`;
    const fileId = randomUUID();
    // Never encode reasons, filenames or subject names into storage paths.
    const prefix = this.env.STORAGE_KEY_PREFIX ? `${this.env.STORAGE_KEY_PREFIX}/` : "";
    const objectKey = `${prefix}tenant/${owner.tenantId}/personnel/${documentId}/${fileId}`;
    const createdAt = new Date();
    await this.storage.putObject({
      tenantId: owner.tenantId,
      objectKey,
      contentType: input.contentType,
      bytes: input.bytes,
    });
    await db.document.create({
      data: {
        id: documentId,
        tenantId: owner.tenantId,
        type: "UPLOAD",
        status: "READY",
        title: input.filename,
        createdAt,
        updatedAt: createdAt,
      },
    });
    await db.file.create({
      data: {
        id: fileId,
        tenantId: owner.tenantId,
        documentId,
        kind: "ORIGINAL",
        storageProvider: this.storage.provider(),
        bucket: this.storage.bucket(),
        objectKey,
        isPublic: false,
        contentType: input.contentType,
        sizeBytes: input.bytes.length,
        createdAt,
      },
    });
    const attachment = {
      documentId,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.bytes.length,
      createdAt: createdAt.toISOString(),
    };
    await this.kv.set({ ...keyFor(owner, documentId), value: attachment }, tx);
    return attachment;
  }
  async download(owner: PersonnelAttachmentOwner, documentId: string, tx: TransactionContext) {
    const row = await this.kv.get(keyFor(owner, documentId), tx);
    if (!isPersonnelDocumentId(documentId) || !row) {
      throw new NotFoundException("Attachment not found");
    }
    const attachment = PersonnelAttachmentSchema.parse(row.value);
    const file = await getPrismaClient(this.prisma, tx).file.findFirst({
      where: {
        tenantId: owner.tenantId,
        documentId,
        isPublic: false,
        document: { archivedAt: null },
      },
    });
    if (!file || attachment.documentId !== documentId) {
      throw new NotFoundException("Attachment not found");
    }
    const bytes = await this.storage.getObject({
      tenantId: owner.tenantId,
      objectKey: file.objectKey,
    });
    return { attachment, bytes };
  }
}
