import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ExtEntityLinkPort,
  EntityLinkCreateInput,
  EntityLinkDeleteInput,
  EntityLinkListInput,
  EntityLink,
} from "../ports/ext-storage.port";

/**
 * Prisma adapter for ExtEntityLink (Entity Links)
 *
 * Implements the ExtEntityLinkPort interface using Prisma to access the ext.entity_link table.
 * Provides module-scoped relationships between entities without schema changes.
 *
 * See: docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md
 */
@Injectable()
export class PrismaExtEntityLinkAdapter implements ExtEntityLinkPort {
  // Maximum metadata payload size (1MB)
  private readonly MAX_METADATA_SIZE = 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async create(input: EntityLinkCreateInput): Promise<EntityLink> {
    // Validate metadata size if present
    if (input.metadata) {
      const metadataStr = JSON.stringify(input.metadata);
      if (Buffer.byteLength(metadataStr, "utf8") > this.MAX_METADATA_SIZE) {
        throw new Error(
          `ExtEntityLink metadata exceeds maximum size of ${this.MAX_METADATA_SIZE} bytes`
        );
      }
    }

    const record = await this.prisma.extEntityLink.create({
      data: {
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        fromEntityType: input.fromEntityType,
        fromEntityId: input.fromEntityId,
        toEntityType: input.toEntityType,
        toEntityId: input.toEntityId,
        linkType: input.linkType,
        metadata: input.metadata as any,
      },
    });

    return this.toDomain(record);
  }

  async delete(input: EntityLinkDeleteInput): Promise<void> {
    await this.prisma.extEntityLink.delete({
      where: {
        tenantId_moduleId_fromEntityType_fromEntityId_toEntityType_toEntityId_linkType: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          fromEntityType: input.fromEntityType,
          fromEntityId: input.fromEntityId,
          toEntityType: input.toEntityType,
          toEntityId: input.toEntityId,
          linkType: input.linkType,
        },
      },
    });
  }

  async list(input: EntityLinkListInput): Promise<EntityLink[]> {
    const records = await this.prisma.extEntityLink.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.moduleId !== undefined ? { moduleId: input.moduleId } : {}),
        ...(input.fromEntityType !== undefined ? { fromEntityType: input.fromEntityType } : {}),
        ...(input.fromEntityId !== undefined ? { fromEntityId: input.fromEntityId } : {}),
        ...(input.toEntityType !== undefined ? { toEntityType: input.toEntityType } : {}),
        ...(input.toEntityId !== undefined ? { toEntityId: input.toEntityId } : {}),
        ...(input.linkType !== undefined ? { linkType: input.linkType } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): EntityLink {
    return {
      id: record.id,
      tenantId: record.tenantId,
      moduleId: record.moduleId,
      fromEntityType: record.fromEntityType,
      fromEntityId: record.fromEntityId,
      toEntityType: record.toEntityType,
      toEntityId: record.toEntityId,
      linkType: record.linkType,
      metadata: record.metadata,
      createdAt: record.createdAt,
    };
  }
}
