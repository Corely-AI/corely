import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import type { ObjectStoragePort } from "@corely/kernel";
import { GcsObjectStorageAdapter } from "@corely/storage";
import {
  TemplateDocuments,
  type TemplateDocumentOwner,
} from "../../application/ports/template-documents.port";
import { SIGN_DOCUMENT_PREFIX } from "../../domain/restricted-document";

function documentId(owner: TemplateDocumentOwner) {
  return (
    SIGN_DOCUMENT_PREFIX +
    createHash("sha256")
      .update(JSON.stringify([owner.tenantId, owner.workspaceId, owner.templateId, owner.sha256]))
      .digest("hex")
  );
}
function verify(owner: TemplateDocumentOwner, bytes: Buffer) {
  if (
    bytes.length > (owner.templateId.startsWith("signed-request/") ? 32 : 10) * 1024 * 1024 ||
    bytes.subarray(0, 5).toString("ascii") !== "%PDF-" ||
    createHash("sha256").update(bytes).digest("hex") !== owner.sha256
  )
    throw Error("Template PDF integrity check failed");
}
@Injectable()
export class PrismaTemplateDocuments extends TemplateDocuments {
  constructor(
    private readonly db: PrismaService,
    @Inject(GcsObjectStorageAdapter) private readonly storage: ObjectStoragePort,
    @Inject(EnvService) private readonly env: Pick<EnvService, "STORAGE_KEY_PREFIX">
  ) {
    super();
  }
  async store(owner: TemplateDocumentOwner, bytes: Buffer) {
    verify(owner, bytes);
    const id = documentId(owner);
    const prefix = this.env.STORAGE_KEY_PREFIX ? this.env.STORAGE_KEY_PREFIX + "/" : "";
    const objectKey = prefix + "tenant/" + owner.tenantId + "/sign/" + id;
    // Content addressing makes a retry after upload-before-DB failure converge on the same bytes.
    await this.storage.putObject({
      tenantId: owner.tenantId,
      objectKey,
      contentType: "application/pdf",
      bytes,
    });
    await this.db.$transaction(async (tx) => {
      await tx.document.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId: owner.tenantId,
          type: "CONTRACT",
          status: "READY",
          metadataJson: {
            workspaceId: owner.workspaceId,
            templateId: owner.templateId,
            sha256: owner.sha256,
          },
        },
      });
      await tx.file.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId: owner.tenantId,
          documentId: id,
          kind: "ORIGINAL",
          storageProvider: this.storage.provider(),
          bucket: this.storage.bucket(),
          objectKey,
          isPublic: false,
          contentType: "application/pdf",
          sha256: owner.sha256,
          sizeBytes: bytes.length,
        },
      });
    });
  }
  async read(owner: TemplateDocumentOwner) {
    const id = documentId(owner);
    const file = await this.db.file.findFirst({
      where: {
        id,
        tenantId: owner.tenantId,
        documentId: id,
        sha256: owner.sha256,
        isPublic: false,
        document: { status: "READY", archivedAt: null },
      },
    });
    if (!file) return null;
    const bytes = await this.storage.getObject({
      tenantId: owner.tenantId,
      objectKey: file.objectKey,
    });
    verify(owner, bytes);
    return bytes;
  }
}
