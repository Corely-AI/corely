import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { getPrismaClient, PrismaService } from "@corely/data";
import { VENDOR_BILL_DOCUMENT_PREFIX } from "@corely/domain";
import type { ObjectStoragePort, TransactionContext } from "@corely/kernel";
import { GcsObjectStorageAdapter } from "@corely/storage";
import type {
  StagedVendorBillDocument,
  VendorBillDocumentOwner,
  VendorBillDocumentsPort,
} from "../../application/ports/vendor-bill-documents.port";

const documentIdFor = (billId: string) => `${VENDOR_BILL_DOCUMENT_PREFIX}${billId}`;

@Injectable()
export class VendorBillDocumentsAdapter implements VendorBillDocumentsPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GcsObjectStorageAdapter) private readonly storage: ObjectStoragePort,
    private readonly env: EnvService
  ) {}

  async stage(
    owner: VendorBillDocumentOwner,
    input: { filename: string; contentType: string; bytes: Buffer }
  ): Promise<StagedVendorBillDocument> {
    const checksum = createHash("sha256").update(input.bytes).digest("hex");
    const prefix = this.env.STORAGE_KEY_PREFIX ? `${this.env.STORAGE_KEY_PREFIX}/` : "";
    const objectKey = `${prefix}tenant/${owner.tenantId}/workspaces/${owner.workspaceId}/bill-originals/${owner.billId}/${checksum}`;
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
    owner: VendorBillDocumentOwner,
    document: StagedVendorBillDocument,
    tx: TransactionContext
  ) {
    const id = documentIdFor(owner.billId);
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

  async downloadUrl(owner: VendorBillDocumentOwner) {
    const file = await this.prisma.file.findFirst({
      where: {
        tenantId: owner.tenantId,
        documentId: documentIdFor(owner.billId),
        kind: "ORIGINAL",
        isPublic: false,
        document: { archivedAt: null },
      },
      select: { objectKey: true },
    });
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
