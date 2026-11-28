import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { getPrismaClient, PrismaService } from "@corely/data";
import type { ObjectStoragePort, TransactionContext } from "@corely/kernel";
import { GcsObjectStorageAdapter } from "@corely/storage";
import type { StagedVendorBillDocument } from "../../application/ports/vendor-bill-documents.port";

type OriginalOwner = { tenantId: string; workspaceId: string; id: string };

@Injectable()
export class PrivateEmailOriginalsAdapter {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GcsObjectStorageAdapter) private readonly storage: ObjectStoragePort,
    private readonly env: EnvService
  ) {}

  async stage(
    owner: OriginalOwner,
    input: { filename: string; contentType: string; bytes: Buffer },
    kind: string
  ): Promise<StagedVendorBillDocument> {
    const checksum = createHash("sha256").update(input.bytes).digest("hex");
    const prefix = this.env.STORAGE_KEY_PREFIX ? `${this.env.STORAGE_KEY_PREFIX}/` : "";
    const objectKey = `${prefix}tenant/${owner.tenantId}/workspaces/${owner.workspaceId}/${kind}/${owner.id}/${checksum}`;
    await this.storage.putObject({
      tenantId: owner.tenantId,
      objectKey,
      contentType: input.contentType,
      bytes: input.bytes,
    });
    return {
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.bytes.length,
      objectKey,
    };
  }

  async register(
    owner: OriginalOwner,
    document: StagedVendorBillDocument,
    tx: TransactionContext,
    id: string
  ) {
    const now = new Date();
    await getPrismaClient(this.prisma, tx).document.create({
      data: {
        id,
        tenantId: owner.tenantId,
        type: "UPLOAD",
        status: "READY",
        title: document.filename,
        createdAt: now,
        updatedAt: now,
        files: {
          create: {
            id: `${id}-original`,
            tenantId: owner.tenantId,
            kind: "ORIGINAL",
            storageProvider: this.storage.provider(),
            bucket: this.storage.bucket(),
            objectKey: document.objectKey,
            isPublic: false,
            contentType: document.contentType,
            sizeBytes: document.sizeBytes,
            createdAt: now,
          },
        },
      },
    });
  }

  private findPrivateFile(owner: OriginalOwner, documentId: string) {
    return this.prisma.file.findFirst({
      where: {
        tenantId: owner.tenantId,
        documentId,
        kind: "ORIGINAL",
        isPublic: false,
        document: { archivedAt: null },
      },
      select: { objectKey: true },
    });
  }

  async read(owner: OriginalOwner, documentId: string) {
    const file = await this.findPrivateFile(owner, documentId);
    return file
      ? this.storage.getObject({ tenantId: owner.tenantId, objectKey: file.objectKey })
      : null;
  }

  async downloadUrl(owner: OriginalOwner, documentId: string) {
    const file = await this.findPrivateFile(owner, documentId);
    if (!file) {
      return null;
    }
    return this.storage.createSignedDownloadUrl({
      tenantId: owner.tenantId,
      objectKey: file.objectKey,
      expiresInSeconds: 120,
    });
  }
}
