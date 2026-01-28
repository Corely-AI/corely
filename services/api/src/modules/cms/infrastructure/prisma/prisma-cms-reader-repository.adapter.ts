import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { CmsReader } from "@prisma/client";
import { CmsReaderEntity } from "../../domain/cms-reader.entity";
import { type CmsReaderRepositoryPort } from "../../application/ports/cms-reader-repository.port";

const mapReader = (row: CmsReader): CmsReaderEntity =>
  new CmsReaderEntity({
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    email: row.email,
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

@Injectable()
export class PrismaCmsReaderRepository implements CmsReaderRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(reader: CmsReaderEntity): Promise<void> {
    await this.prisma.cmsReader.create({
      data: {
        id: reader.id,
        tenantId: reader.tenantId,
        workspaceId: reader.workspaceId,
        email: reader.email,
        passwordHash: reader.passwordHash,
        displayName: reader.displayName,
        createdAt: reader.createdAt,
        updatedAt: reader.updatedAt,
      },
    });
  }

  async findByEmail(tenantId: string, email: string): Promise<CmsReaderEntity | null> {
    const row = await this.prisma.cmsReader.findFirst({
      where: { tenantId, email },
    });
    return row ? mapReader(row) : null;
  }

  async findById(tenantId: string, readerId: string): Promise<CmsReaderEntity | null> {
    const row = await this.prisma.cmsReader.findFirst({
      where: { tenantId, id: readerId },
    });
    return row ? mapReader(row) : null;
  }
}
