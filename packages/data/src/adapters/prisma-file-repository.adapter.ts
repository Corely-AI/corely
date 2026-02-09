import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { type FileRepoPort } from "@corely/kernel";
import { FileEntity, type FileKind } from "@corely/domain";

const mapFile = (row: any): FileEntity =>
  new FileEntity({
    id: row.id,
    tenantId: row.tenantId,
    documentId: row.documentId,
    kind: row.kind,
    storageProvider: row.storageProvider,
    bucket: row.bucket,
    objectKey: row.objectKey,
    isPublic: row.isPublic ?? false,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    createdAt: row.createdAt,
  });

@Injectable()
export class PrismaFileRepoAdapter implements FileRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(file: FileEntity): Promise<void> {
    await this.prisma.file.create({
      data: {
        id: file.id,
        tenantId: file.tenantId,
        documentId: file.documentId,
        kind: file.kind as any,
        storageProvider: file.storageProvider as any,
        bucket: file.bucket,
        objectKey: file.objectKey,
        isPublic: file.isPublic,
        contentType: file.contentType ?? null,
        sizeBytes: file.sizeBytes ?? null,
        sha256: file.sha256 ?? null,
        createdAt: file.createdAt,
      },
    });
  }

  async save(file: FileEntity): Promise<void> {
    await this.prisma.file.update({
      where: { id: file.id },
      data: {
        kind: file.kind as any,
        storageProvider: file.storageProvider as any,
        bucket: file.bucket,
        objectKey: file.objectKey,
        isPublic: file.isPublic,
        contentType: file.contentType ?? null,
        sizeBytes: file.sizeBytes ?? null,
        sha256: file.sha256 ?? null,
      },
    });
  }

  async findById(tenantId: string, fileId: string): Promise<FileEntity | null> {
    const row = await this.prisma.file.findFirst({ where: { id: fileId, tenantId } });
    return row ? mapFile(row) : null;
  }

  async findByIdGlobal(fileId: string): Promise<FileEntity | null> {
    const row = await this.prisma.file.findUnique({ where: { id: fileId } });
    return row ? mapFile(row) : null;
  }

  async findByDocument(tenantId: string, documentId: string): Promise<FileEntity[]> {
    const rows = await this.prisma.file.findMany({ where: { tenantId, documentId } });
    return rows.map(mapFile);
  }

  async findByDocumentAndKind(
    tenantId: string,
    documentId: string,
    kind: FileKind
  ): Promise<FileEntity | null> {
    const row = await this.prisma.file.findFirst({ where: { tenantId, documentId, kind } });
    return row ? mapFile(row) : null;
  }
}
