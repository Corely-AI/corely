import { NotFoundError } from "@corely/domain";
import { type PrismaService } from "@corely/data";
import type { DocumentsPort } from "../../ports/documents.port";
import { type ObjectStoragePort } from "@corely/kernel";

export class DocumentsPortAdapter implements DocumentsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStoragePort
  ) {}

  async getAudioBuffer(params: {
    tenantId: string;
    documentId: string;
  }): Promise<{ buffer: Buffer; contentType: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: params.documentId, tenantId: params.tenantId },
    });

    if (!document) {
      throw new NotFoundError("Document not found", { code: "Issues:DocumentNotFound" });
    }

    const file =
      (await this.prisma.file.findFirst({
        where: { tenantId: params.tenantId, documentId: params.documentId, kind: "ORIGINAL" },
      })) ??
      (await this.prisma.file.findFirst({
        where: { tenantId: params.tenantId, documentId: params.documentId },
      }));

    if (!file) {
      throw new NotFoundError("File not found", { code: "Issues:DocumentNotFound" });
    }

    const buffer = await this.storage.getObject({
      tenantId: params.tenantId,
      objectKey: file.objectKey,
    });
    return { buffer, contentType: file.contentType ?? "application/octet-stream" };
  }
}
